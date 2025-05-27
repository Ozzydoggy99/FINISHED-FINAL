const { v4: uuidv4 } = require('uuid');
const EventEmitter = require('events');

class WorkflowManager extends EventEmitter {
    constructor() {
        super();
        this.workflows = new Map();
        this.activeWorkflows = new Map();
        this.workflowTemplates = new Map();
    }

    // Register a new workflow template
    registerWorkflowTemplate(name, template) {
        this.workflowTemplates.set(name, template);
    }

    // Create a new workflow instance from a template
    createWorkflow(templateName, robotId, mapId, options = {}) {
        const template = this.workflowTemplates.get(templateName);
        if (!template) {
            throw new Error(`Workflow template ${templateName} not found`);
        }

        const workflowId = uuidv4();
        const workflow = {
            id: workflowId,
            template: templateName,
            robotId,
            mapId,
            status: 'created',
            currentStep: 0,
            steps: template.steps,
            options,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        this.workflows.set(workflowId, workflow);
        return workflow;
    }

    // Start a workflow
    async startWorkflow(workflowId) {
        const workflow = this.workflows.get(workflowId);
        if (!workflow) {
            throw new Error(`Workflow ${workflowId} not found`);
        }

        workflow.status = 'running';
        workflow.updatedAt = new Date();
        this.activeWorkflows.set(workflowId, workflow);
        
        this.emit('workflowStarted', workflow);
        return this.executeWorkflow(workflow);
    }

    // Execute workflow steps
    async executeWorkflow(workflow) {
        try {
            while (workflow.currentStep < workflow.steps.length) {
                const step = workflow.steps[workflow.currentStep];
                workflow.status = `executing_step_${workflow.currentStep}`;
                workflow.updatedAt = new Date();
                
                this.emit('stepStarted', { workflow, step });
                
                await this.executeStep(workflow, step);
                
                workflow.currentStep++;
                this.emit('stepCompleted', { workflow, step });
            }

            workflow.status = 'completed';
            workflow.updatedAt = new Date();
            this.activeWorkflows.delete(workflow.id);
            this.emit('workflowCompleted', workflow);
        } catch (error) {
            workflow.status = 'failed';
            workflow.error = error.message;
            workflow.updatedAt = new Date();
            this.activeWorkflows.delete(workflow.id);
            this.emit('workflowFailed', { workflow, error });
            throw error;
        }
    }

    // Execute a single step
    async executeStep(workflow, step) {
        // This will be implemented by the specific robot controller
        this.emit('stepExecution', { workflow, step });
    }

    // Get workflow status
    getWorkflowStatus(workflowId) {
        return this.workflows.get(workflowId);
    }

    // Get all active workflows
    getActiveWorkflows() {
        return Array.from(this.activeWorkflows.values());
    }

    // Cancel a workflow
    cancelWorkflow(workflowId) {
        const workflow = this.workflows.get(workflowId);
        if (workflow) {
            workflow.status = 'cancelled';
            workflow.updatedAt = new Date();
            this.activeWorkflows.delete(workflowId);
            this.emit('workflowCancelled', workflow);
        }
    }
}

module.exports = WorkflowManager; 