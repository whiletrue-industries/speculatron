import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs/operators';
import { from, Observable } from 'rxjs';

import { AIRTABLE_API_KEY } from '../../../../CONFIGURATION';

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  API_KEY = AIRTABLE_API_KEY;
  AIRTABLE_BASE = 'https://api.airtable.com/v0';
  CONTENT_TABLE = 'Content';
  
  constructor(private http: HttpClient) { }

  airtableToMapping() {
    return map((response: any) => {
      const ret: any = {};
      response.records.forEach((i: any) => {
        ret[i.id] = Object.assign(i.fields, {id: i.id});
      });
      return ret;
    });
  }

  airtableToArray() {
    return map((response: any) => {
      const ret = response.records.map((i: any) => Object.assign({id: i.id}, i.fields));
      return ret;
    });
  }

  airtableFetch(base: string, table: string, view: string, record?: string, fields?: string[]): Observable<any> {
    const headers = {
      Authorization: `Bearer ${this.API_KEY}`
    };
    let url = `${this.AIRTABLE_BASE}/${base}/${table}`;
    let params: any = {};
    if (record) {
      url += `/${record}`;
    } else {
      params = {
        maxRecords: 1000,
        view,
      };
      if (fields) {
        params.fields = fields;
      }
    }
    return this.http.get(
      url, {headers, params}
    );
  }
}
