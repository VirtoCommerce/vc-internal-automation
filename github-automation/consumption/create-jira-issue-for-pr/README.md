# Creates Jira Issue of type "Review" to review new pull requests

This Logic App creates a Jira Issue of type "Review" to review new pull requests created in <https://github.com/VirtoCommerce/> repositories. Webhook (pull_request type) should be created for Logic App call in the repository.

"Review" Jira issue creates for pull request where author is not in VirtoCommerce\platform or VirtoCommerce\storefront-team (optional) team and title not contain any Jira key like JIRA-123.

## Features

* Creates a new issue of type "Review" for all new pull requests
* Adds label "review task created"
* Adds comment with a link to Jira Issue

## Deployment

* Run `create-jira-issue-for-pr.bicep` to deploy Logic App

```bash
az deployment group create  
--resource-group "your-resource-group" 
--template-file "/full_path/create-jira-issue-for-pr.bicep" 
--parameters logicAppName="create-jira-issue-for-pr"
--parameters githubOrg="VirtoCommerce"
--parameters githubTeam="platform"
--parameters githubTeamStorefront="storefront-team"
--parameters jiraInstance="https://virtocommerce.atlassian.net"
--parameters jiraIssuetype="10160"
--parameters jiraIssuetypeStorefront="10160"
--parameters jiraProject="PT"
--parameters jiraProjectStorefront="PT"
--parameters reviewTaskLabel="review task created"
--parameters integrationAccountId="/subscriptions/subscription-id/resourceGroups/your-resource-group/providers/Microsoft.Logic/integrationAccounts/your-integration-account"
--parameters githubAuthorizationHeader="your_github_token"
--parameters jiraConnection "{ jira: {connectionId:'/subscriptions/subscription-id/resourceGroups/your-resource-group/providers/Microsoft.Web/connections/jira' connectionName:'jira' id: '/subscriptions/subscription-id/providers/Microsoft.Web/locations/your-location/managedApis/jira'}}"
```

## Link repository

* Get Logic App HTTP POST URL
* Add repository pull request webhook Settings->Webhooks->Add webhook
* In `Payload URL` paste Logic App HTTP POST URL
* Chose `Let me select individual events`-> unchek `Pushes` -> check `Pull request`
* Click `Add webhook`
