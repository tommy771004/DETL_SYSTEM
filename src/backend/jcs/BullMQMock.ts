import { EventEmitter } from 'events';

export const jobStore: Record<string, any> = {};
export const jobLogs: Record<string, string[]> = {};
let mockWorkerProcessor: any = null;

export class Job {
    id: string;
    name: string;
    data: any;
    progress: any = 0;
    timestamp: number;
    finishedOn?: number;
    failedReason?: string;
    state: string = 'waiting';

    constructor(name: string, data: any) {
        this.id = Date.now().toString() + Math.floor(Math.random() * 1000);
        this.name = name;
        this.data = data;
        this.timestamp = Date.now();
        jobStore[this.id] = this;
        jobLogs[this.id] = [];
    }

    async getState() {
        return this.state;
    }

    async updateProgress(progressMsg: any) {
        this.progress = progressMsg;
    }

    async log(msg: string) {
        if (!jobLogs[this.id]) {
            jobLogs[this.id] = [];
        }
        jobLogs[this.id].push(msg);
    }
}

export class Queue {
    name: string;

    constructor(name: string, opts?: any) {
        this.name = name;
    }

    async add(name: string, data: any, opts?: any) {
        const job = new Job(name, data);
        console.log(`[Mock Queue] Added job ${job.id}`);
        // Asynchronously process the job if we have a worker processor
        if (mockWorkerProcessor) {
            setTimeout(async () => {
                job.state = 'active';
                try {
                    await mockWorkerProcessor(job);
                    job.state = 'completed';
                    job.finishedOn = Date.now();
                    workerEvents.emit('completed', job);
                    queueEventsStore.emit('completed', { jobId: job.id, returnvalue: job.data });
                } catch (err: any) {
                    job.state = 'failed';
                    job.failedReason = err.message;
                    job.finishedOn = Date.now();
                    workerEvents.emit('failed', job, err);
                    queueEventsStore.emit('failed', { jobId: job.id, failedReason: err.message });
                }
            }, 100);
        }
        return job;
    }

    async getWaiting() { return Object.values(jobStore).filter(j => j.state === 'waiting'); }
    async getActive() { return Object.values(jobStore).filter(j => j.state === 'active'); }
    async getCompleted() { return Object.values(jobStore).filter(j => j.state === 'completed'); }
    async getFailed() { return Object.values(jobStore).filter(j => j.state === 'failed'); }
    
    async getJob(id: string) {
        return jobStore[id] || null;
    }

    async getJobLogs(id: string) {
        return { logs: jobLogs[id] || [] };
    }
}

const workerEvents = new EventEmitter();
export const queueEventsStore = new EventEmitter();

export class Worker {
    constructor(name: string, processor: any, opts?: any) {
        mockWorkerProcessor = processor;
    }

    on(event: string, handler: any) {
        workerEvents.on(event, handler);
    }
}

export class QueueEvents extends EventEmitter {
    constructor(name: string, opts?: any) {
        super();
        queueEventsStore.on('completed', (data) => this.emit('completed', data));
        queueEventsStore.on('failed', (data) => this.emit('failed', data));
        queueEventsStore.on('progress', (data) => this.emit('progress', data));
    }
}
