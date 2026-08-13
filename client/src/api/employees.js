import api from './client';

export function fetchEmployees(params) {
  return api.get('/employees', { params }).then((res) => res.data);
}

export function fetchEmployee(id) {
  return api.get(`/employees/${id}`).then((res) => res.data);
}

export function createEmployee(payload) {
  return api.post('/employees', payload).then((res) => res.data);
}

export function fetchDepartments() {
  return api.get('/departments').then((res) => res.data);
}
