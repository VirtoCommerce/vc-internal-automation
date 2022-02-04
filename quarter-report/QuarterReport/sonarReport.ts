import fetch from "node-fetch";

const QUALITY_GATE = 'alert_status'
const RELIABILITY = 'reliability_rating'
const SECURITY = 'security_rating'
const MAINTAINABILITY = 'sqale_rating'
const CODE_SMELLS = 'code_smells'
const COVERAGE = 'coverage'
const FULL_REPORT = 'full_report'
const GATE_FILED = 'ERROR'

const LIGHT_RED = '#FFCCCB'
const DARK_YELLOW = '#CCCC00'
const LIGHT_BLUE = '#87CEFA'
const DARK_GREEN = '#00CC66'

const SONAR_GREEN = '#6ACD6A'
const SONAR_GREEN_YELLOW = '#B0D513'
const SONAR_YELLOW = '#EABE06'
const SONAR_ORANGE = '#ED7D20'
const SONAR_RED = '#D4333F'

const BULLET_SYMBOL = '&#8226'

const metricValues: string[] = [QUALITY_GATE, RELIABILITY, SECURITY, MAINTAINABILITY, CODE_SMELLS, COVERAGE]

type ComponentInfo = 
{
    qualityGateValue: string,
    qualityGateColor: string,
    reliabilityValue: string,
    reliabilityColor: string,
    securityValue: string,
    securityColor: string,
    maintainabilityValue: string,
    maintainabilityColor: string,
    codeSmellValue: string,
    codeSmellColor: string,
    coverageValue: string,
    coverageColor: string
}

interface ComponentDict 
{ 
    [key: string]: ComponentInfo
}
interface SonarResponse
{
    metric: string,
    value: string,
    component: string,
    bestValue: boolean
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

function createComponentMetrics(componentList:string [], sonarMetricsList: SonarResponse[]){
    let componentMetrics: ComponentDict = {};
    componentList.forEach(component => {
        let filteredSonarMetricsList = sonarMetricsList.filter(metric => metric.component.includes(component));

        componentMetrics[component] = {
            qualityGateValue: filteredSonarMetricsList.find(metric => metric.metric.includes(QUALITY_GATE))?.value ? filteredSonarMetricsList.find(metric => metric.metric.includes(QUALITY_GATE)).value : null,
            qualityGateColor: null,
            reliabilityValue: filteredSonarMetricsList.find(metric => metric.metric.includes(RELIABILITY))?.value ? filteredSonarMetricsList.find(metric => metric.metric.includes(RELIABILITY)).value : null,
            reliabilityColor: null,
            securityValue: filteredSonarMetricsList.find(metric => metric.metric.includes(SECURITY))?.value ? filteredSonarMetricsList.find(metric => metric.metric.includes(SECURITY)).value : null,
            securityColor: null,
            maintainabilityValue: filteredSonarMetricsList.find(metric => metric.metric.includes(MAINTAINABILITY))?.value ? filteredSonarMetricsList.find(metric => metric.metric.includes(MAINTAINABILITY)).value : null,
            maintainabilityColor: null,
            codeSmellValue: filteredSonarMetricsList.find(metric => metric.metric.includes(CODE_SMELLS))?.value ? filteredSonarMetricsList.find(metric => metric.metric.includes(CODE_SMELLS)).value : null,
            codeSmellColor: null,
            coverageValue: filteredSonarMetricsList.find(metric => metric.metric.includes(COVERAGE))?.value ? filteredSonarMetricsList.find(metric => metric.metric.includes(COVERAGE)).value : null,
            coverageColor: null
        };
    });
    return componentMetrics;
}


function createQualityPageContent(componentList:string [], componentMetrics: ComponentDict){

    console.log("Creating Confluence Quality page content");

    Guard.AgainstNull(componentList, 'componentList');

    let pageBody: string = '';
    let rowN: number = 0;

    pageBody += '<p></p>'
    pageBody += '<table><tbody>'
    pageBody += `<tr> <th>#</th> <th>Component</th> <th>${QUALITY_GATE}</th> <th>${RELIABILITY}</th> <th>${SECURITY}</th> <th>${MAINTAINABILITY}</th> <th>${CODE_SMELLS}</th> <th>${COVERAGE}</th> </tr>`

    for(let component of componentList){
        const gateColor = componentMetrics[component].qualityGateColor ? ` bgcolor="${componentMetrics[component].qualityGateColor}"` : '';
        const coverageColor = componentMetrics[component].coverageColor ? ` bgcolor="${componentMetrics[component].coverageColor}"` : '';
        const reliabilityColor = componentMetrics[component].reliabilityColor ? ` bgcolor="${componentMetrics[component].reliabilityColor}"` : '';
        const securityColor = componentMetrics[component].securityColor ? ` bgcolor="${componentMetrics[component].securityColor}"` : '';
        const maintainabilityColor = componentMetrics[component].maintainabilityColor ? ` bgcolor="${componentMetrics[component].maintainabilityColor}"` : '';
        const codeSmellColor = componentMetrics[component].codeSmellColor ? ` bgcolor="${componentMetrics[component].codeSmellColor}"` : '';

        pageBody += `<tr> `
        pageBody += `<td>${++ rowN}</td> `
        pageBody += `<td>${component}</td> <td${gateColor}>${componentMetrics[component].qualityGateValue}</td> `
        pageBody += `<td${reliabilityColor}>${componentMetrics[component].reliabilityValue}</td> `
        pageBody += `<td${securityColor}>${componentMetrics[component].securityValue}</td> `
        pageBody += `<td${maintainabilityColor}>${componentMetrics[component].maintainabilityValue}</td> `
        pageBody += `<td${codeSmellColor}>${componentMetrics[component].codeSmellValue}</td> <td${coverageColor}>${componentMetrics[component].coverageValue}</td> `
        pageBody += `</tr>`
    }
    pageBody += '</tbody></table>';

    Guard.AgainstNull(pageBody, 'pageBody');

    pageBody += createPageLegend();

    return pageBody;
}


function createPageLegend(){

    console.log("Creating page Legend content");

    let legendBody: string = '';

    legendBody += '<p></p>'
    legendBody += '<p>CodeCoverage Legend</p>'
    legendBody += '<table><tbody>'
    legendBody += `<tr style="color:${LIGHT_RED};"><td>${BULLET_SYMBOL}</td> <td>0%-29%</td></tr>`
    legendBody += `<tr style="color:${DARK_YELLOW};"><td>${BULLET_SYMBOL}</td> <td>30%-49%</td></tr>`
    legendBody += `<tr style="color:${LIGHT_BLUE};"><td>${BULLET_SYMBOL}</td> <td>50%-79%</td></tr>`
    legendBody += `<tr style="color:${DARK_GREEN};"><td>${BULLET_SYMBOL}</td> <td>80%-100%</td></tr>`
   
    legendBody += '</tbody></table>';

    return legendBody;
}

function createPageContent(componentList: SonarResponse[], metricName: string){

    console.log("Creating Confluence page content");

    Guard.AgainstNull(componentList, 'componentList');

    let pageBody: string = '';
    let rowN: number = 0;

    pageBody += '<p></p>'
    pageBody += '<table><tbody>'
    pageBody += `<tr> <th>#</th> <th>Component</th> <th>${metricName}</th> </tr>`

    for(let component of componentList){
        pageBody += `<tr> <td>${++ rowN}</td> <td>${component.component}</td> <td>${component.value}</td> </tr>`
    }
    pageBody += '</tbody></table>';

    Guard.AgainstNull(pageBody, 'pageBody');

    return pageBody;
}

function fillColors(componentList:string [], componentMetrics: ComponentDict) {
    for(let component of componentList){
        if(componentMetrics[component].qualityGateValue === GATE_FILED ){
            componentMetrics[component].qualityGateColor = LIGHT_RED;
        }
        const reliabilityFloatValue = componentMetrics[component].reliabilityValue ? parseFloat(componentMetrics[component].reliabilityValue) : null;
        const maintainabilityFloatValue = componentMetrics[component].maintainabilityValue ? parseFloat(componentMetrics[component].maintainabilityValue) : null;
        const securityFloatValue = componentMetrics[component].securityValue ? parseFloat(componentMetrics[component].securityValue) : null;
        const codeSmellFloatValue = componentMetrics[component].codeSmellValue ? parseFloat(componentMetrics[component].codeSmellValue) : null;

        componentMetrics[component].reliabilityColor = reliabilityFloatValue != null ? calculateRatingColor(reliabilityFloatValue) : null;
        componentMetrics[component].maintainabilityColor = maintainabilityFloatValue != null ? calculateRatingColor(maintainabilityFloatValue) : null;
        componentMetrics[component].securityColor = securityFloatValue != null ? calculateRatingColor(securityFloatValue) : null;
        componentMetrics[component].codeSmellColor = codeSmellFloatValue != null ? calculateRatingColor(codeSmellFloatValue) : null;

        const coverageFloatValue = componentMetrics[component].coverageValue ? parseFloat(componentMetrics[component].coverageValue) : null;
        componentMetrics[component].coverageColor = coverageFloatValue != null ? calculateCoverageColor(coverageFloatValue) : null;
    }
    return componentMetrics;
}

function calculateCoverageColor(metricValue: number) {
    let result = LIGHT_RED;

    if (metricValue >= 30) {
        result = DARK_YELLOW;
    }
    if (metricValue >= 50) {
        result = LIGHT_BLUE;
    }
    if (metricValue >= 80) {
        result = DARK_GREEN;
    }

    return result
}

function calculateRatingColor(metricValue: number) {
    let result = LIGHT_RED;

    if (metricValue === 4.0) {
        result = SONAR_ORANGE;
    }
    if (metricValue === 3.0) {
        result = SONAR_YELLOW;
    }
    if (metricValue === 2.0) {
        result = SONAR_GREEN_YELLOW;
    }
    if (metricValue === 1.0) {
        result = DARK_GREEN;
    }

    return result
}


async function getMetricValues(sonarUrl: string) {

    console.log(`Start search CodeSmells`);

    Guard.AgainstNull(sonarUrl, 'sonarUrl');
    const response = await fetch(sonarUrl, {
        method: 'get',
        headers: {'Content-Type': 'application/json'}
    });
    const result = await response.json();
    return result['measures'];
}


export async function getFullSonarReport(componentList:string [] ):Promise<string> {
    const componentListString = componentList.toString();
    const baseUrl = 'https://sonarcloud.io/api/measures/search';
    const queryUrl: string = `${baseUrl}?projectKeys=${componentListString}&metricKeys=${metricValues.toString()}`
    const metricsList: SonarResponse[] = await getMetricValues(queryUrl);

    let componentMetrics = createComponentMetrics(componentList,metricsList);
    componentMetrics = fillColors(componentList, componentMetrics);
    const pageContent = createQualityPageContent(componentList,componentMetrics);
    return pageContent;
}
