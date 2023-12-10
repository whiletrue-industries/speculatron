import { HttpClient } from "@angular/common/http";
import { map, tap } from "rxjs";

export class BaserowTable {

    rows: any[] = [];

    constructor(private endpoint: string, private token: string, private id: number, public name: string) {
    }

    fetchRows(http: HttpClient) {
        return http.get(`${this.endpoint}/api/database/rows/table/${this.id}/?user_field_names=true`, {
            headers: {
                Authorization: `Token ${this.token}`
            }
        }).pipe(
            map((data: any) => data.results),
            tap((data: any) => {
                this.rows = data;
            })
        );
    }
}
