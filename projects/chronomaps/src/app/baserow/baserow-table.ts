import { HttpClient } from "@angular/common/http";
import { from, map, tap } from "rxjs";

export class BaserowTable {

    rows: any[] = [];
    hasRows = false;

    constructor(private endpoint: string, private token: string, private id: number, public name: string) {
    }

    fetchRows(http: HttpClient, force = false) {
        if (!this.hasRows || force) {
            return http.get(`${this.endpoint}/api/database/rows/table/${this.id}/?user_field_names=true&size=100`, {
                headers: {
                    Authorization: `Token ${this.token}`
                }
            }).pipe(
                map((data: any) => data.results),
                tap((data: any) => {
                    this.rows = data;
                    this.hasRows = true;
                }),
                map(() => this)
            );    
        } else {
            return from([this]);
        }
    }
}
