import { AxiosResponse } from 'axios';
import { ApiBase } from '../api-base.class';
import { MultValueResponse, WorkItem } from '../types';
import { WiqlQueryResult } from '../types/wiql-query-result.type';
import { CommonWorkItemProperties, WorkItemBatchRequest } from '../types/work-item-batch-request.type';
import { getAppSettings } from '../../services';

export class WorkItemService extends ApiBase {
	protected get projectName(): string {
		return getAppSettings().get('project') as string;
	}
	protected get teamName(): string {
		return getAppSettings().get('team') as string;
	}

	constructor() {
		super('_apis/wit');
	}

	queryForWorkItems(iterationPath: string, areaPath: string[], boardColumn: string): Promise<WorkItem[]> {
		const systemAreaPath: string = areaPath.map((ap) => `[System.AreaPath] = '${ap}'`).join(' OR ');

		const data: { query: string } = {
			query: `SELECT [System.State], [System.Title] FROM WorkItems WHERE [System.IterationPath] = '${iterationPath}' AND (${systemAreaPath}) AND [System.BoardColumn] = '${boardColumn}' ORDER BY [State] Asc`
		};

		return this.axios
			.post(`${this.baseUrl}${this.organizationName}/${this.projectName}/${this.teamName}/${this.endPoint}/wiql?${this.apiVersion}`, data)
			.then((response: AxiosResponse<WiqlQueryResult>) => {
				return this.getWorkItems(response.data.workItems.map((wi) => wi.id));
			});
	}

	getWorkItems(ids: number[]): Promise<WorkItem[]> {
		if (ids.length === 0) {
			return Promise.resolve([]);
		}

		return this.axios
			.get(`${this.baseUrl}${this.organizationName}/${this.projectName}/${this.endPoint}/workitems?${this.apiVersion}&ids=${ids.join(',')}&$expand=All`)
			.then((response) => {
				return (response.data as MultValueResponse<WorkItem>).value;
			});
	}

	getWorkItemsByBatch(ids: number[]): Promise<WorkItem[]> {
		if (ids.length === 0) {
			return Promise.resolve([]);
		}

		const data: WorkItemBatchRequest = {
			ids: ids,
			fields: CommonWorkItemProperties
		};

		return this.axios.post(`${this.baseUrl}${this.organizationName}/${this.projectName}/${this.endPoint}/workitemsbatch?${this.apiVersion}`, data).then((response) => {
			return (response.data as MultValueResponse<WorkItem>).value;
		});
	}

	updateWorkItem(id: number, changes: unknown): Promise<WorkItem> {
		return this.axios
			.patch(`${this.baseUrl}${this.organizationName}/${this.projectName}/${this.endPoint}/workitems/${id}?${this.apiVersion}`, changes, {
				headers: {
					'Content-Type': 'application/json-patch+json'
				}
			})
			.then((response) => {
				return response.data as WorkItem;
			});
	}
}
