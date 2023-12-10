import { HttpClient } from "@angular/common/http";
import { BaserowTable } from "./baserow-table";
import { ReplaySubject, filter, first, forkJoin, map, switchMap, tap } from "rxjs";

export class BaserowDatabase {

    tables = new ReplaySubject<BaserowTable[]>(1);

    constructor(private endpoint: string, private token: string, private database: number) {
    }

    fetchTables(http: HttpClient) {
        return http.get(`${this.endpoint}/api/database/tables/database/${this.database}/`, {
            headers: {
                Authorization: `Token ${this.token}`
            }
        }).pipe(
            map((data: any) => {
                return data.map((table: any) => new BaserowTable(this.endpoint, this.token, table.id, table.name));
            }),
            switchMap((tables: BaserowTable[]) => {
                return forkJoin(tables.map((table: BaserowTable) => table.fetchRows(http))).pipe(
                    map(() => tables)
                );
            }),
            tap((tables) => {
                this.tables.next(tables)
            })
        );
    }

    getTable(name: string) {
        return this.tables.pipe(
            first(),
            map((tables) => tables.find((table: BaserowTable) => table.name === name))
        );
    }
}