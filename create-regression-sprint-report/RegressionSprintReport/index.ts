import { AzureFunction, Context, HttpRequest } from "@azure/functions"
import fetch from "node-fetch";
import * as yaml from "js-yaml";

const loginSecretParam = "ConfluenceLogin";
const passwordSecretParam = "ConfluenceToken";
const confluenceUrlParam = "ConfluenceUrl";
const jiraUrlParam = "jiraUrl";
const modulePrefix = "VirtoCommerce."


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
    const regexUrl = /^https?\:\/\/([^\/?#]+)(?:[\/?#]|$)/i;
    const matches = url.match(regexUrl);
    // extract hostname (will be null if no match is found)
    return matches && matches[1];
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
    const response = await fetch(configMapUrl);
    const doc = yaml.load(await response.text());
    let modulesList = doc["data"]?.["modules.json"];
    return parseModulesVersion(JSON.parse(modulesList));
}

async function getModuleIssues(moduleName: string, projectId: string, issueType: string, jiraUrl: string, currentSprint:string, userName: string, password: string){

    let issuesLinks:string = "";

    const headers = { 
        'Authorization': `Basic ` + Buffer.from(`${userName}:${password}`).toString('base64'),
        'Accept': 'application/json'
    }
    const query: string = `/search?jql=project = ${projectId} AND issuetype = ${issueType} AND "Component[Dropdown]" = ${moduleName}`;
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
            const hostname: string = getHostName(jiraUrl);
            const issuesArray = result["issues"];
            for (let index = 0; index < issuesArray.length; index++) {
                const currentLink: string = `https://${hostname}/browse/${issuesArray[index]["key"]}`;
                issuesLinks += `<p><a href=\"${currentLink}\" data-card-appearance=\"inline\">${currentLink}</a></p> `;
            }
        }
    } catch (error) {
        console.error(error)
    }

    return issuesLinks;
}

async function fillModulesIssues(modulesList: ModuleInfo[],projectId: string, issueType: string, jiraUrl: string, currentSprint:string, userName: string, password: string) {
    for (let index = 0; index < modulesList.length; index++) {
        const sprintIssues: string = await getModuleIssues(modulesList[index].id, projectId, issueType, jiraUrl, currentSprint, userName, password) ;
        const oldIssues: string = "";
        modulesList[index].sprintIssues = sprintIssues;
        modulesList[index].oldIssues = oldIssues;
    }
    return modulesList;
}


async function publishConfluencePage(confluencePageSettings: ConfluencePageInfo, confluenceUrl: string, userName: string, password: string){

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

        return await response.json();
    
    } catch (error) {
        console.log(error)
    }
}

function createPageContent(modulesList: ModuleInfo[]){
    let pageBody: string = '<table>';
    let rowN: number = 0;
    pageBody += '<tr> <th>#</th> <th>Module Name</th> <th>Module Version</th> <th>Existed integrations</th> <th>Type testing</th> <th>Issues from previous sprints</th> <th>Issues</th> </tr>'
    for(let module of modulesList){
        pageBody += `<tr> <td>${++ rowN}</td> <td>${module.id}</td> <td>${module.version}</td> <td></td> <td></td> <td>${module.oldIssues}</td> <td>${module.sprintIssues}</td> </tr>`
    }
    pageBody += '</table>';

    return pageBody;
}

function createPageSettings(pageType: string, pageTitle: string, spaceKey: string, subpageId: number, pageBody: string, pageRepresentation: string): ConfluencePageInfo{
    const pageSettings: ConfluencePageInfo = 
    {
        type: pageType,
        title: pageTitle,
        ancestors:[
            {
                id: subpageId
            }
        ], 
        space:{
            key: spaceKey
        },
        body:{
            storage:{
                value: pageBody,
                representation: pageRepresentation
            }
        }
    };
    return pageSettings;
}

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {

    const login = process.env[loginSecretParam];
    const password = process.env[passwordSecretParam];
    const confluenceUrl = process.env[confluenceUrlParam];
    const jiraUrl = process.env[jiraUrlParam];

    context.log('HTTP trigger function processed a request.');
    const name = (req.query.name || (req.body && req.body.name));

    const configMapUrl = req.body && req.body.configMapUrl;
    const responseMessage = name
        ? "Hello, " + name + ". This HTTP triggered function executed successfully."
        : `Body: ${req.body}`;

    context.res = {
        // status: 200, /* Defaults to 200 */
        body: responseMessage
    };

    const currentSprint = "7";

    const pageType: string = "page"; 
    const pageTitle: string = "new page"; 
    const spaceKey: string = "PLREC"; 
    const subpageId: number = 234160191; 
    const pageRepresentation: string = "storage";

    const projectId: string = "PT";
    const issueType: string = "Bug";


    let modulesList = configMapUrl ? await getModulesList(configMapUrl) : null;
    modulesList = modulesList ? await fillModulesIssues(modulesList, projectId, issueType, jiraUrl, currentSprint, login, password) : null;
    
    const pageBody = createPageContent(modulesList);
    const pageSettings = createPageSettings(pageType, pageTitle,spaceKey, subpageId, pageBody,pageRepresentation);
    const res = await publishConfluencePage(pageSettings, confluenceUrl, login, password);

//    console.log(pageSettings);
    console.log(res);
};

export default httpTrigger;