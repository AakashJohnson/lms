import axiosInstance from '../../utils/axiosConfig';

export interface TeacherContentPlanPayload {
  courseId?: string;
  moduleId?: string;
  planningMode?: 'course' | 'custom';
  customTitle?: string;
  customContent?: string;
  customFile?: File | null;
  planningType: string;
  duration: string;
  classLevel?: string;
  language: string;
  teachingStyle: string;
  teacherInstruction?: string;
  selectedSources?: Record<string, boolean>;
}

export async function getPlanningOverview() {
  const res = await axiosInstance.get('/trainer/content-planning/overview');
  return res.data;
}

export async function generateContentPlan(payload: TeacherContentPlanPayload) {
  if (payload.customFile) {
    const formData = new FormData();
    Object.entries(payload).forEach(([key, value]) => {
      if (key === 'customFile' && value instanceof File) {
        formData.append('file', value);
      } else if (value !== undefined && value !== null) {
        formData.append(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
      }
    });
    const res = await axiosInstance.post('/trainer/content-planning/generate', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  }
  const res = await axiosInstance.post('/trainer/content-planning/generate', payload);
  return res.data;
}

export async function getPlanHistory() {
  const res = await axiosInstance.get('/trainer/content-planning/history');
  return res.data;
}

export async function updatePlan(planId: string, payload: Record<string, unknown>) {
  const res = await axiosInstance.patch(`/trainer/content-planning/${planId}`, payload);
  return res.data;
}

export async function savePlan(planId: string) {
  return updatePlan(planId, { status: 'saved' });
}

export async function createByteFromPlan(planId: string, suggestionId?: string) {
  const res = await axiosInstance.post(`/trainer/content-planning/${planId}/create-byte`, { suggestionId });
  return res.data;
}

export async function createAssessmentFromPlan(planId: string, suggestionId?: string) {
  const res = await axiosInstance.post(`/trainer/content-planning/${planId}/create-assessment`, { suggestionId });
  return res.data;
}

export async function createLiveSessionFromPlan(planId: string) {
  const res = await axiosInstance.post(`/trainer/content-planning/${planId}/create-live-session`, {});
  return res.data;
}

export async function publishPlan(planId: string) {
  const res = await axiosInstance.post(`/trainer/content-planning/${planId}/publish`, {});
  return res.data;
}

export async function deletePlan(planId: string) {
  const res = await axiosInstance.delete(`/trainer/content-planning/${planId}`);
  return res.data;
}
