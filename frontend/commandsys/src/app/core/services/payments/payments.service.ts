import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_URL } from '../constants';

@Injectable({ providedIn: 'root' })
export class PaymentsService {
    constructor(private http: HttpClient) {}

    createPayment(body: any) {
        return this.http.post(`${API_URL}/payments`, body).toPromise();
    }

    getPaymentsByCash(id_cash_session: number) {
        return this.http.get(`${API_URL}/payments/by-cash?id=${id_cash_session}`).toPromise();
    }

    getOrderDetail(id_order: number) {
        return this.http.get<any>(`${API_URL}/payments/order/${id_order}`).toPromise();
    }

    getPendingPrebills() {
    return this.http.get<any[]>(`${API_URL}/payments/pending-prebills`).toPromise();
    }

}
