import requests
from typing import List, Dict, Any

class GitHubService:
    BASE_URL = "https://api.github.com"

    @staticmethod
    def fetch_latest_issues(repo_full_name: str, limit: int = 5) -> List[Dict[str, Any]]:
        """
        Fetches the latest open issues from a public GitHub repository.
        Example repo_full_name: 'facebook/react'
        """
        url = f"{GitHubService.BASE_URL}/repos/{repo_full_name}/issues"
        
        # We only want actual issues, not pull requests (GitHub API treats PRs as issues)
        params = {
            "state": "open",
            "sort": "created",
            "direction": "desc",
            "filter": "all",
            "per_page": min(limit * 5, 50)  # Fetch more to allow filtering out PRs
        }
        
        headers = {
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "Nova-AI-Triage"
        }

        response = requests.get(url, params=params, headers=headers)
        response.raise_for_status()
        
        raw_issues = response.json()
        
        # Filter out pull requests and format
        formatted_issues = []
        for issue in raw_issues:
            if "pull_request" not in issue:
                title = issue.get("title", "").strip()
                body = (issue.get("body") or "").strip()
                
                # Truncate body if too long
                if len(body) > 1000:
                    body = body[:1000] + "... [truncated]"
                
                # Use title + body if available, otherwise just title
                content = f"{title}\n\n{body}" if body else title
                
                formatted_issues.append({
                    "title": title,
                    "body": content,
                    "url": issue.get("html_url", ""),
                    "reporter": issue["user"]["login"] if "user" in issue else "ghost"
                })
                
                if len(formatted_issues) >= limit:
                    break
                    
        return formatted_issues
