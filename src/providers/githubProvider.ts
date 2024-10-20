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
    const contentEncoded = Buffer.from("placeholder content").toString(
      "base64"
    ); // Base64 encode content

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
        console.error(
          `Error checking if folder '${folderPath}' exists:`,
          error
        );
        throw error;
      }
    }
  }

  // Rename a folder (Table)
  async renameFolder(
    oldFolderPath: string,
    newFolderPath: string
  ): Promise<void> {
    try {
      // Check if the old folder exists
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
          await this.createOrUpdateFile(
            newFilePath,
            fileContent.content,
            `Move '${file.name}' from '${oldFolderPath}' to '${newFolderPath}'`
          );
          // Delete the old file
          await this.deleteFile(
            filePath,
            `Delete '${file.name}' from '${oldFolderPath}' after moving`
          );
        }

        console.log(
          `All files moved. No need to explicitly delete empty folder '${oldFolderPath}'`
        );
      } else {
        console.error(
          `No files found in folder '${oldFolderPath}'. Skipping deletion.`
        );
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
          await this.deleteFile(
            file.path,
            `Delete file '${file.name}' from folder '${folderPath}'`
          );
        }
        console.log(`Deleted folder: ${folderPath}`);
      }
    } catch (error) {
      console.error(`Error deleting folder '${folderPath}':`, error);
      throw error;
    }
  }

  async createOrUpdateFile(filePath: string, content: string, message: string): Promise<void> {
    try {
      // Fetch the latest SHA for the file if it exists
      const sha = await this.getFileSHA(filePath);
      
      // Prepare the content (convert to base64)
      const encodedContent = Buffer.from(content).toString("base64");
  
      // Make the PUT request to create or update the file
      await this.octokit.repos.createOrUpdateFileContents({
        owner: this.owner,
        repo: this.repo,
        path: filePath,
        message: message,
        content: encodedContent,
        sha: sha, // If SHA is undefined, it will create a new file
        committer: {
          name: this.committerName,
          email: this.committerEmail,
        },
      });
  
      console.log(`File '${filePath}' created or updated successfully.`);
    } catch (error: any) {
      if (error.status === 409) {
        console.log(`Conflict detected for file '${filePath}', retrying...`);
        
        // Retry logic: Fetch the latest SHA and try again
        const latestSHA = await this.getFileSHA(filePath);
        const encodedContent = Buffer.from(content).toString("base64");
        
        // Retry the update with the latest SHA
        await this.octokit.repos.createOrUpdateFileContents({
          owner: this.owner,
          repo: this.repo,
          path: filePath,
          message: message,
          content: encodedContent,
          sha: latestSHA,
          committer: {
            name: this.committerName,
            email: this.committerEmail,
          },
        });
  
        console.log(`File '${filePath}' updated successfully after retry.`);
      } else {
        console.error("Error creating or updating file:", error);
        throw error;
      }
    }
  }

  async getFileSHA(filePath: string): Promise<string | undefined> {
    try {
      const response = await this.octokit.repos.getContent({
        owner: this.owner,
        repo: this.repo,
        path: filePath,
      });

      // If the response is an array, it's a directory, and we cannot get a SHA
      if (Array.isArray(response.data)) {
        throw new Error(`The path '${filePath}' is a directory, not a file.`);
      }

      // If it's a file, return the SHA
      if ("sha" in response.data) {
        return response.data.sha;
      }

      throw new Error(`The content at '${filePath}' is not a valid file.`);
    } catch (error: any) {
      if (error.status === 404) {
        return undefined; // File doesn't exist, so SHA is not needed for creation
      }
      throw error; // Handle other errors
    }
  }

  // Get a file
  async getFile(filePath: string): Promise<{ content: string; sha: string }> {
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
      const { sha } = await this.getFile(filePath); // Get the correct sha for the file
      await this.octokit.repos.deleteFile({
        owner: this.owner,
        repo: this.repo,
        path: filePath,
        message: commitMessage, // Dynamic commit message based on file deletion
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

  // Get folder contents (for table contents)
  async getFolderContents(
    folderPath: string
  ): Promise<Array<{ path: string; name: string }>> {
    try {
      const { data } = await this.octokit.repos.getContent({
        owner: this.owner,
        repo: this.repo,
        path: folderPath,
      });

      if (Array.isArray(data)) {
        return data.map((item) => ({ path: item.path, name: item.name }));
      } else {
        throw new Error(`No contents found for folder '${folderPath}'`);
      }
    } catch (error) {
      console.error(
        `Error fetching folder contents for '${folderPath}':`,
        error
      );
      throw error;
    }
  }

  // Get repo contents (for clearing the repo)
  async getRepoContents(): Promise<
    Array<{ path: string; name: string; type: string }>
  > {
    try {
      const { data } = await this.octokit.repos.getContent({
        owner: this.owner,
        repo: this.repo,
        path: "", // Empty path fetches repo root
      });

      if (Array.isArray(data)) {
        return data.map((item) => ({
          path: item.path,
          name: item.name,
          type: item.type,
        }));
      } else {
        throw new Error("No contents found in repository.");
      }
    } catch (error) {
      console.error(`Error fetching repository contents:`, error);
      throw error;
    }
  }
}

export default GitHubProvider;
