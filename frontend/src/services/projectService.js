import api from './api';

// Project management services
export const projectService = {
    // Get all projects
    getAll: async () => {
        const response = await api.get('/projects');
        return response.data;
    },

    // Get single project by ID
    getById: async (id) => {
        const response = await api.get(`/projects/${id}`);
        return response.data;
    },

    // Create new project
    create: async (projectData) => {
        const response = await api.post('/projects', projectData);
        return response.data;
    },

    // Update project
    update: async (id, projectData) => {
        const response = await api.put(`/projects/${id}`, projectData);
        return response.data;
    },

    // Delete project
    delete: async (id) => {
        const response = await api.delete(`/projects/${id}`);
        return response.data;
    },

    // Add team member to project
    addMember: async (projectId, userId, role = 'member') => {
        const response = await api.post(`/projects/${projectId}/members`, { userId, role });
        return response.data;
    },

    // Remove team member from project
    removeMember: async (projectId, userId) => {
        const response = await api.delete(`/projects/${projectId}/members/${userId}`);
        return response.data;
    },

    // Update team member role
    updateMemberRole: async (projectId, userId, role) => {
        const response = await api.put(`/projects/${projectId}/members/${userId}/role`, { role });
        return response.data;
    },

    // Get project invite link
    getInviteLink: async (projectId) => {
        const response = await api.get(`/projects/${projectId}/invite`);
        return response.data;
    },

    // Regenerate invite code
    regenerateInviteCode: async (projectId) => {
        const response = await api.post(`/projects/${projectId}/invite/regenerate`);
        return response.data;
    },

    // Get project info by invite code (public)
    getByInviteCode: async (inviteCode) => {
        const response = await api.get(`/projects/invite/${inviteCode}`);
        return response.data;
    },

    // Join project via invite code
    joinProject: async (inviteCode) => {
        const response = await api.post(`/projects/join/${inviteCode}`);
        return response.data;
    },
};

export default projectService;
