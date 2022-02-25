import { Octokit } from "@octokit/rest"

function getQuarterBorders(fullYear: number, quarter: number){
    const quarterBorders = 
    {
        'Q1': {
            'from': '-01-01T00:00:00Z',
            'to': '-04-01T00:00:00Z'
        },
        'Q2': {
            'from': '-04-01T00:00:00Z',
            'to': '-07-01T00:00:00Z'
        },
        'Q3': {
            'from': '-07-01T00:00:00Z',
            'to': '-10-01T00:00:00Z'
        },
        'Q4': {
            'from': '-10-01T00:00:00Z',
            'to': '-12-31T23:59:59Z'
        }
    };
    return {
        'from': `${fullYear}${quarterBorders[`Q${quarter}`].from}`,
        'to': `${fullYear}${quarterBorders[`Q${quarter}`].to}`
    }
}

async function countReleasesForPeriod(owner: string, repo: string, from: string, to: string, gitHubToken): Promise<number> {
    const octokit = new Octokit({
        auth: `${gitHubToken}`,
      });

    let releaseCount: number = 0;
    const per_page: number = 100;
    let page: number = 1;
    
    const releases = await octokit.rest.repos.listReleases({
        owner,
        repo,
        per_page,
        page
      });
    if (releases.status === 200 ) {
        releases['data'].forEach( release => {
            if (release['created_at']> from && release['created_at'] < to) {
                releaseCount ++;
            } 
        });
    }

    return releaseCount;
}

async function createReleasePageContent(componentList:string [], owner: string, from: string, to: string, gitHubToken){
    console.log("Creating Confluence Releases page content");
    let pageBody: string = '';
    let rowN: number = 0;

    pageBody +=`<h2>Releases Report</h2>`;
    pageBody += '<p></p>';
    pageBody += `<table data-layout="default"><tbody>`;
    pageBody += `<tr><th>#</th><th>Component</th> <th>Releases count</th></tr>`;


    for (const repo of componentList) {
        let releaseCount = await countReleasesForPeriod(owner, repo, from, to, gitHubToken)

        pageBody += `<tr>`;
        pageBody += `<td>${++ rowN}</td>`
        pageBody += `<td>${repo}</td> <td>${releaseCount}</td>`
        pageBody += `</tr>`;
    }

    pageBody += '</tbody></table>';
    pageBody += `<hr />`

    return pageBody;
}

export async function getReleasesReport (componentList:string [], owner: string, year: number, quarter: number, gitHubToken) {
// TODO: Sort asc componentList
    const quarterBorders = getQuarterBorders(year, quarter)
    return await createReleasePageContent(componentList, owner, quarterBorders.from, quarterBorders.to, gitHubToken)
}