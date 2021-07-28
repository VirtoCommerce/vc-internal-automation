import { AzureFunction, Context, HttpRequest } from "@azure/functions"
import fetch from "node-fetch";
import * as yaml from "js-yaml";


interface ModuleInfo
{
    id: string,
    version: string
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

async function parseModulesVersion(modulesList: any[]){
    let modulesVersionArray: ModuleInfo[] = [];
    for( let module of modulesList){
        const regexVersion = /_\d+\.\d+\.\d+/;
        let packageUrl: string = module["PackageUrl"];
        let moduleVersion: ModuleInfo = {
            id: module["Id"].replace("VirtoCommerce.","") ,
            version: module["Id"] + packageUrl.match(regexVersion)?.[0]
        }
        modulesVersionArray.push(moduleVersion);
    }
    return modulesVersionArray;
}

async function getModulesList(configMapUrl: string){
    const response = await fetch(configMapUrl);
    const doc = yaml.load(await response.text());
    let modulesList = doc["data"]?.["modules.json"];
    return await parseModulesVersion(JSON.parse(modulesList));
}

async function createConfluencePage(confluencePageSettings: ConfluencePageInfo, ){
}


function createPageContent(modulesVersion: ModuleInfo[], currentSprint: string){
    let pageBody: string = '<table>';
    let rowN: number = 0;
    pageBody += '<tr> <th>#</th> <th>Module Name</th> <th>Module Version</th> <th>Existed integrations</th> <th>Type testing</th> <th>Issues from previous sprints</th> <th>Issues</th> </tr>'
    for(let module of modulesVersion){
        pageBody += `<tr> <td>${rowN ++}</td> <td>${module.id}</td> <td>${module.version}</td> <td></td> <td></td> <td></td> <td></td> </tr>`
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
//    const configMapUrl = "https://raw.githubusercontent.com/VirtoCommerce/vc-deploy-apps/qa/regression-app/overlays/qa/deployment-cm.yaml";
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
    const deploymentCm = configMapUrl ? await getModulesList(configMapUrl) : null;
    const pageBody = createPageContent(deploymentCm, currentSprint)
    console.log(deploymentCm);
    console.log(pageBody);
};

export default httpTrigger;