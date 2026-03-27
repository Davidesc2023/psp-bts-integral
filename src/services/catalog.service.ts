import { supabase } from './supabaseClient';
import { Department, City, EPS, IPS } from '@/types';

export const catalogService = {
  getDepartments: async (): Promise<Department[]> => {
    const { data, error } = await supabase
      .from('departments')
      .select('id, code, name, country_id')
      .order('name');
    if (error) throw error;
    return (data ?? []) as Department[];
  },

  getCitiesByDepartment: async (departmentId: number): Promise<City[]> => {
    const { data, error } = await supabase
      .from('cities')
      .select('id, code, name, department_id')
      .eq('department_id', departmentId)
      .order('name');
    if (error) throw error;
    return (data ?? []) as City[];
  },

  getAllCities: async (): Promise<City[]> => {
    const { data, error } = await supabase
      .from('cities')
      .select('id, code, name, department_id')
      .order('name');
    if (error) throw error;
    return (data ?? []) as City[];
  },

  getEPSList: async (): Promise<EPS[]> => {
    const { data, error } = await supabase
      .from('eps')
      .select('id, code, name, regime, active')
      .order('name');
    if (error) throw error;
    return (data ?? []) as EPS[];
  },

  getIPSList: async (): Promise<IPS[]> => {
    const { data, error } = await supabase
      .from('ips')
      .select('id, name, type, city_id, active')
      .order('name');
    if (error) throw error;
    return (data ?? []) as IPS[];
  },
};
