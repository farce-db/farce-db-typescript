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

  async createFile(
    filePath: string,
    content: any,
    commitMessage: string
  ): Promise<string> {
    console.log('Content:', JSON.stringify(content));
    
    try {
      // Convert the content object to a string
      const contentString = JSON.stringify(content);
      
      // Encode the string to base64
      const encodedContent = Buffer.from(contentString).toString('base64');
      
      const response = await this.octokit.repos.createOrUpdateFileContents({
        owner: this.owner,
        repo: this.repo,
        path: filePath,
        message: commitMessage,
        content: encodedContent,
        committer: {
          name: this.committerName,
          email: this.committerEmail,
        },
      });
  
      if (response.data.content && response.data.content.sha) {
        return response.data.content.sha;
      } else {
        throw new Error("SHA not found in response.");
      }
  
    } catch (error) {
      console.error("Error creating file:", error);
      throw error;
    }
  }

  async getFile(filePath: string): Promise<string> {
    try {
      const { data } = await this.octokit.repos.getContent({
        owner: this.owner,
        repo: this.repo,
        path: filePath,
      });

      if ("content" in data) {
        return Buffer.from(data.content, "base64").toString("utf8");
      } else {
        throw new Error("Content not found or is not a file.");
      }
    } catch (error) {
      console.error("Error fetching file:", error);
      throw error;
    }
  }
}

export default GitHubProvider;