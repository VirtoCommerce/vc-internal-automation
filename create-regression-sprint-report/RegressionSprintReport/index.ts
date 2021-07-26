import { AzureFunction, Context, HttpRequest } from "@azure/functions"
import fetch from "node-fetch";
import * as yaml from "js-yaml";


interface ModuleInfo
{
    id: string,
    version: string
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


const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
    const configMapUrl = "https://raw.githubusercontent.com/VirtoCommerce/vc-deploy-apps/qa/regression-app/overlays/qa/deployment-cm.yaml";
    context.log('HTTP trigger function processed a request.');
    const name = (req.query.name || (req.body && req.body.name));
    const responseMessage = name
        ? "Hello, " + name + ". This HTTP triggered function executed successfully."
        : "This HTTP triggered function executed successfully. Pass a name in the query string or in the request body for a personalized response.";

    context.res = {
        // status: 200, /* Defaults to 200 */
        body: responseMessage
    };

    let deploymentCm = await getModulesList(configMapUrl);
    console.log(deploymentCm);
};

export default httpTrigger;