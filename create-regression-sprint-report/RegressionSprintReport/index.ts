import { AzureFunction, Context, HttpRequest } from "@azure/functions"
import fetch from "node-fetch";
import * as yaml from "js-yaml";

const loginSecretParam = "ConfluenceLogin";
const passwordSecretParam = "ConfluenceToken";
const confluenceUrlParam = "ConfluenceUrl";
const jiraUrlParam = "jiraUrl";
const modulePrefix = "VirtoCommerce.";
const platformKey = "docker.pkg.github.com/virtocommerce/vc-platform/platform";


interface ModuleInfo
{
    id: string,
    version: string,
    sprintIssues: string,
    oldIssues: string
}

interface ConfluencePageInfo
{
    type: string,
    title: string,
    ancestors:[
        {
            id:number
        }
    ], 
    space:{
        key: string
    },
    body:{
        storage:{
            value: string,
            representation: string
        }
    }
}

function getHostName(url: string){
    const regexUrl = /^https?\:\/\/([^\/?#]+)(?:[\/?#]|$)/i; // will return domain name without protocol and path %www.github.com%
    const matches = url.match(regexUrl);
    // extract hostname (will be null if no match is found)
    return matches && matches[1];
}


class Guard
{
    public static AgainstNull(argument: any, argumentName: string): any
    {
        if (argument == null)
        {
            throw new Error(`ArgumentNullException: ${argumentName} value cannot be null`) ;
        }
    }
}

async function getPlatformVersion(kustomizationUrl:string){

    console.log("Get Platform version");

    const response = await fetch(kustomizationUrl);
    const doc = yaml.load(await response.text());
    const imageIndex = doc["images"].findIndex( x => x.name === platformKey );

    let platformVersion: ModuleInfo = {
        id:  "Platform",
        version: doc["images"][imageIndex]["newTag"],
        oldIssues: null,
        sprintIssues: null
    }

    Guard.AgainstNull(platformVersion, 'platformVersion');

    return platformVersion;
}

function parseModulesVersion(modulesList: any[]){

    let modulesVersionArray: ModuleInfo[] = [];

    for( let module of modulesList){
        const regexVersion = /_\d+\.\d+\.\d+/;
        let packageUrl: string = module["PackageUrl"];
        let moduleVersion: ModuleInfo = {
            id: module["Id"].replace(modulePrefix ,"") ,
            version: module["Id"] + packageUrl.match(regexVersion)?.[0],
            oldIssues: null,
            sprintIssues: null
        }
        modulesVersionArray.push(moduleVersion);
    }
    return modulesVersionArray;
}

async function getModulesList(configMapUrl: string){

    console.log("Get modules list");

    const response = await fetch(configMapUrl);
    const doc = yaml.load(await response.text());
    let modulesList = doc["data"]?.["modules.json"];
    
    const result = parseModulesVersion(JSON.parse(modulesList));
    
    Guard.AgainstNull(result, 'result');
    
    return result;
}

async function getModuleIssues(moduleName: string, parentIssueKey:string, inParent: boolean, issueType: string, jiraUrl: string, userName: string, password: string){

    if (inParent) {
        console.log(`Search ${moduleName} module issues for current regression sprint`);
    } else {
        console.log(`Search ${moduleName} module issues for previous sprints`);
    }

    let issuesLinks:string = "";

    const headers = { 
        'Authorization': `Basic ` + Buffer.from(`${userName}:${password}`).toString('base64'),
        'Accept': 'application/json'
    }
    const operator: string = inParent ? "=" : "!="
    const query: string = `/search?jql=parent ${operator} ${parentIssueKey} AND issuetype = ${issueType} AND "Component[Dropdown]" = ${moduleName} AND labels IN (Regression) AND labels NOT IN (FixedOnRegression)`;
    const url = jiraUrl.replace(/\/+$/, '') + query; // remove trailing slashes
    
    try {
        
        const response = await fetch(
            url, {
            method: 'GET',
            headers: headers
            }
        );

        const result = JSON.parse(await response.text());
        if (result["issues"]) {
            const issuesArray = result["issues"];
            for (let index = 0; index < issuesArray.length; index++) {
                issuesLinks += `<p><ac:structured-macro ac:name=\"jira\" ac:schema-version=\"1\" ac:macro-id=\"e6f873c8-59d1-4ae2-82ff-bf8e2378369f\"><ac:parameter ac:name=\"server\">System JIRA</ac:parameter><ac:parameter ac:name=\"serverId\">ddb34fca-5878-3e2d-898b-cb89d86c7acf</ac:parameter><ac:parameter ac:name=\"key\">${issuesArray[index]["key"]}</ac:parameter></ac:structured-macro></p>`
            }
        }
    } catch (error) {
        console.error(error)
    }

    return issuesLinks;
}

async function fillModulesIssues(modulesList: ModuleInfo[],parentIssueKey: string, issueType: string, jiraUrl: string,  userName: string, password: string) {

    console.log(`Start search issues`);

    Guard.AgainstNull(modulesList, 'modulesList');
    
    for (let index = 0; index < modulesList.length; index++) {
        const sprintIssues: string = await getModuleIssues(modulesList[index].id, parentIssueKey, true, issueType, jiraUrl, userName, password) ;
        const oldIssues: string = await getModuleIssues(modulesList[index].id, parentIssueKey, false, issueType, jiraUrl, userName, password) ;
        modulesList[index].sprintIssues = sprintIssues;
        modulesList[index].oldIssues = oldIssues;
    }
    
    Guard.AgainstNull(modulesList, 'modulesList');

    return modulesList;
}


async function publishConfluencePage(confluencePageSettings: ConfluencePageInfo, confluenceUrl: string, userName: string, password: string){

    console.log("Publishing Confluence page");

    const body: string = JSON.stringify(confluencePageSettings);
    const headers = { 
        'Authorization': `Basic ` + Buffer.from(`${userName}:${password}`).toString('base64'),
        'Content-Type': 'application/json'
    }
    try {
        const response = await fetch(confluenceUrl, {
            method: 'POST',
            body: body,
            headers: headers
        });

        return response;
    
    } catch (error) {
        console.error(error)
    }
}

function createPageContent(modulesList: ModuleInfo[], parentIssueKey: string){

    console.log("Creating Confluence page content");

    Guard.AgainstNull(modulesList, 'loginSecretParam');

    let pageBody: string = `<p><ac:structured-macro ac:name=\"jira\" ac:schema-version=\"1\" ac:macro-id=\"e6f873c8-59d1-4ae2-82ff-bf8e2378369f\"><ac:parameter ac:name=\"server\">System JIRA</ac:parameter><ac:parameter ac:name=\"serverId\">ddb34fca-5878-3e2d-898b-cb89d86c7acf</ac:parameter><ac:parameter ac:name=\"key\">${parentIssueKey}</ac:parameter></ac:structured-macro></p>`;
    let rowN: number = 0;

    pageBody += '<p></p>'
    pageBody += '<table><tbody>'
    pageBody += '<tr> <th>#</th> <th>Module Name</th> <th>Module Version</th> <th>Type testing</th> <th>Issues from previous sprints</th> <th>Issues</th> </tr>'

    for(let module of modulesList){
        pageBody += `<tr> <td>${++ rowN}</td> <td>${module.id}</td> <td>${module.version}</td> <td></td> <td>${module.oldIssues}</td> <td>${module.sprintIssues}</td> </tr>`
    }
    pageBody += '</tbody></table>';

    Guard.AgainstNull(pageBody, 'pageBody');

    return pageBody;
}

function createPageSettings(pageType: string, pageTitle: string, spaceKey: string, subpageId: number, pageBody: string, pageRepresentation: string): ConfluencePageInfo {
    const pageSettings: ConfluencePageInfo = {
        type: pageType,
        title: pageTitle,
        ancestors: [{
            id: subpageId
        }], 
        space: {
            key: spaceKey
        },
        body: {
            storage: {
                value: pageBody,
                representation: pageRepresentation
            }
        }
    };

    Guard.AgainstNull(pageSettings, 'pageSettings');

    return pageSettings;
}

async function checkPageNotExist(pageTitle:string, spaceKey: string, confluenceUrl: string, userName: string, password: string) {
    console.log("Publishing Confluence page");

    const queryUrl: string = confluenceUrl + `\?title=${pageTitle}&spaceKey=${spaceKey}&status=current`;
    const headers = { 
        'Authorization': `Basic ` + Buffer.from(`${userName}:${password}`).toString('base64'),
    }
    try {
        const response = await fetch(queryUrl, {
            method: 'GET',
            headers: headers
        });

        let resJson = await response.json();
        let result = resJson["size"] > 0 ? false: true;
        return result;
    
    } catch (error) {
        console.error(error)
    }
}


const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {

    context.log('HTTP trigger function processed a request.');

    let responseMessage ;
    let status= 200;

    try {
        
        const login = process.env[loginSecretParam];
        Guard.AgainstNull(login, loginSecretParam);
        const password = process.env[passwordSecretParam];
        Guard.AgainstNull(password, passwordSecretParam);
        const confluenceUrl = process.env[confluenceUrlParam];
        Guard.AgainstNull(confluenceUrl, confluenceUrlParam);
        const jiraUrl = process.env[jiraUrlParam];
        Guard.AgainstNull(jiraUrl, jiraUrlParam);

        const configMapUrl = req.body && req.body.configMapUrl;
        Guard.AgainstNull(configMapUrl, 'configMapUrl');
        const kustomizationUrl = req.body && req.body.kustomizationUrl;
        Guard.AgainstNull(kustomizationUrl, 'kustomizationUrl');
        const pageType = req.body && req.body.pageType; 
        Guard.AgainstNull(pageType, 'pageType');
        const pageTitle = req.body && req.body.pageTitle; 
        Guard.AgainstNull(pageTitle, 'pageTitle');
        const spaceKey = req.body && req.body.spaceKey; 
        Guard.AgainstNull(spaceKey, 'spaceKey');
        const subpageId = req.body && req.body.subpageId; 
        Guard.AgainstNull(subpageId, 'subpageId');
        const pageRepresentation = req.body && req.body.pageRepresentation;
        Guard.AgainstNull(pageRepresentation, 'pageRepresentation');

        const issueType = req.body && req.body.issueType;
        Guard.AgainstNull(issueType, 'issueType');
        const parentIssueKey = req.body && req.body.parentIssueKey;
        Guard.AgainstNull(parentIssueKey, 'parentIssueKey');

        if (await checkPageNotExist(pageTitle, spaceKey, confluenceUrl, login, password)) {

            let modulesList: any[] = await getModulesList(configMapUrl);
            modulesList = modulesList.sort((a,b) => (a.id > b.id) ? 1 : ((b.id > a.id) ? -1 : 0));
            modulesList.unshift(await getPlatformVersion(kustomizationUrl));
            
            modulesList = await fillModulesIssues(modulesList, parentIssueKey, issueType, jiraUrl, login, password);
    
            const pageBody = createPageContent(modulesList, parentIssueKey);
            const pageSettings = createPageSettings(pageType, pageTitle,spaceKey, subpageId, pageBody,pageRepresentation);
            const publishResult = await publishConfluencePage(pageSettings, confluenceUrl, login, password);
    
            if (publishResult && publishResult.status === 200) {
                responseMessage = "Regression sprint report executed successfully."
            } else {
                responseMessage = publishResult ? await publishResult.json() : "Regression sprint report publishing error";
                status =  publishResult ?  publishResult.status: 400;
            }
        } else {
            responseMessage = `Page with "${pageTitle}" title already exists.`;
            status = 400;
        }

    } catch (error) {
        console.error(error);
        status = 400;
        responseMessage = error;
    }

    console.log(responseMessage);

    context.res = {
        status: status, 
        body: responseMessage
    };
};

export default httpTrigger;
