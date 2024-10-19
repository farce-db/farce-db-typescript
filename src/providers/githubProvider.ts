// src/providers/GitHubProvider.ts
import { Octokit } from "@octokit/rest";

export interface GitHubProviderOptions {
  token: string;
  owner: string;
  repo: string;
  committerName: string;
  committerEmail: string;
}

class GitHubProvider {
  private octokit: Octokit;
  private owner: string;
  private repo: string;
  private committerName: string;
  private committerEmail: string;

  constructor(options: GitHubProviderOptions) {
    this.octokit = new Octokit({ auth: options.token });
    this.owner = options.owner;
    this.repo = options.repo;
    this.committerName = options.committerName;
    this.committerEmail = options.committerEmail;
  }

  // Create a folder (Table)
  async createFolder(folderPath: string): Promise<void> {
    const contentEncoded = Buffer.from('placeholder content').toString('base64'); // Base64 encode content

    try {
      // Check if the folder already exists
      await this.octokit.repos.getContent({
        owner: this.owner,
        repo: this.repo,
        path: folderPath,
      });
      console.log(`Folder '${folderPath}' already exists. Skipping creation.`);
    } catch (error: any) {
      if (error.status === 404) {
        // Folder doesn't exist, create it
        try {
          await this.octokit.repos.createOrUpdateFileContents({
            owner: this.owner,
            repo: this.repo,
            path: `${folderPath}/.gitkeep`, // Add a .gitkeep to represent the folder
            message: `Create folder '${folderPath}'`, // Commit message
            content: contentEncoded, // Base64-encoded content
            committer: {
              name: this.committerName,
              email: this.committerEmail,
            },
          });
          console.log(`Created folder: ${folderPath}`);
        } catch (createError) {
          console.error(`Error creating folder '${folderPath}':`, createError);
          throw createError;
        }
      } else {
        console.error(`Error checking if folder '${folderPath}' exists:`, error);
        throw error;
      }
    }
  }

  // Rename a folder (Table)
  async renameFolder(oldFolderPath: string, newFolderPath: string): Promise<void> {
    try {
      const contents = await this.octokit.repos.getContent({
        owner: this.owner,
        repo: this.repo,
        path: oldFolderPath,
      });

      if (Array.isArray(contents.data)) {
        for (const file of contents.data) {
          const filePath = file.path;
          const fileContent = await this.getFile(filePath);
          const newFilePath = filePath.replace(oldFolderPath, newFolderPath);

          // Create the file in the new folder
          await this.createFile(newFilePath, fileContent.content, `Move '${file.name}' from '${oldFolderPath}' to '${newFolderPath}'`);
          // Delete the old file
          await this.deleteFile(filePath, `Delete '${file.name}' from '${oldFolderPath}' after moving`);
        }
        // After moving the files, delete the old folder
        await this.deleteFolder(oldFolderPath);
      } else {
        console.error(`No files found in folder '${oldFolderPath}'`);
      }
    } catch (error) {
      console.error(`Error renaming folder '${oldFolderPath}':`, error);
      throw error;
    }
  }

  // Delete a folder (Table)
  async deleteFolder(folderPath: string): Promise<void> {
    try {
      const contents = await this.octokit.repos.getContent({
        owner: this.owner,
        repo: this.repo,
        path: folderPath,
      });

      if (Array.isArray(contents.data)) {
        for (const file of contents.data) {
          await this.deleteFile(file.path, `Delete file '${file.name}' from folder '${folderPath}'`);
        }
        console.log(`Deleted folder: ${folderPath}`);
      }
    } catch (error) {
      console.error(`Error deleting folder '${folderPath}':`, error);
      throw error;
    }
  }

  // Create a file
  async createFile(filePath: string, content: any, commitMessage: string): Promise<string> {
    const contentString = typeof content === 'string' ? content : JSON.stringify(content);
    const contentEncoded = Buffer.from(contentString).toString('base64');

    let sha: string | undefined;

    try {
      // Check if the file already exists by trying to get its contents
      const existingFile = await this.octokit.repos.getContent({
        owner: this.owner,
        repo: this.repo,
        path: filePath,
      });

      if (existingFile.data && 'sha' in existingFile.data) {
        sha = existingFile.data.sha;  // Store the sha for updating
      }
    } catch (error: any) {
      if (error.status !== 404) {
        console.error('Error fetching existing file:', error);
        throw error;
      }
      // File doesn't exist, so it's safe to create a new one without sha
    }

    try {
      const response = await this.octokit.repos.createOrUpdateFileContents({
        owner: this.owner,
        repo: this.repo,
        path: filePath,
        message: commitMessage,  // Commit message
        content: contentEncoded,
        sha: sha,  // Include sha if updating an existing file
        committer: {
          name: this.committerName,
          email: this.committerEmail,
        },
      });

      return response.data.content?.sha || 'Unknown SHA';
    } catch (error) {
      console.error('Error creating or updating file:', error);
      throw error;
    }
  }

  // Get a file
  async getFile(filePath: string): Promise<{ content: string, sha: string }> {
    try {
      const { data } = await this.octokit.repos.getContent({
        owner: this.owner,
        repo: this.repo,
        path: filePath,
      });

      if ("content" in data) {
        const content = Buffer.from(data.content, "base64").toString("utf8");
        const sha = data.sha;
        return { content, sha };
      } else {
        throw new Error("Content not found or is not a file.");
      }
    } catch (error) {
      console.error("Error fetching file:", error);
      throw error;
    }
  }

  // Delete a file
  async deleteFile(filePath: string, commitMessage: string): Promise<void> {
    try {
      const { sha } = await this.getFile(filePath);  // Get the correct sha for the file
      await this.octokit.repos.deleteFile({
        owner: this.owner,
        repo: this.repo,
        path: filePath,
        message: commitMessage,  // Dynamic commit message based on file deletion
        sha: sha,
        committer: {
          name: this.committerName,
          email: this.committerEmail,
        },
      });
      console.log(`Deleted file: ${filePath}`);
    } catch (error) {
      console.error(`Error deleting file ${filePath}:`, error);
      throw error;
    }
  }
}

export default GitHubProvider;



