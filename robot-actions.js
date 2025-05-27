class RobotAction {
    constructor(name, params = {}) {
        this.name = name;
        this.params = params;
        this.status = 'pending';
        this.result = null;
        this.error = null;
    }

    async execute(robot) {
        throw new Error('execute() must be implemented by subclass');
    }

    validate() {
        return true;
    }

    toJSON() {
        return {
            name: this.name,
            params: this.params,
            status: this.status,
            result: this.result,
            error: this.error
        };
    }
}

// Movement Actions
class MoveToPointAction extends RobotAction {
    constructor(pointName, mapId, options = {}) {
        super('moveToPoint', { pointName, mapId, ...options });
    }

    async execute(robot) {
        try {
            const point = await robot.getPointByName(this.params.mapId, this.params.pointName);
            if (!point) {
                throw new Error(`Point ${this.params.pointName} not found in map ${this.params.mapId}`);
            }

            const [x, y, z = 0] = point.coordinates;
            const moveAction = await robot.createMoveAction({
                type: 'standard',
                target_x: x,
                target_y: y,
                target_z: z,
                target_ori: point.properties.yaw || null,
                creator: `robot-interface-${robot.config.serialNumber}`
            });

            this.result = moveAction;
            this.status = 'completed';
            return moveAction;
        } catch (error) {
            this.error = error;
            this.status = 'failed';
            throw error;
        }
    }
}

class MoveToCoordinatesAction extends RobotAction {
    constructor(x, y, z = 0, orientation = null) {
        super('moveToCoordinates', { x, y, z, orientation });
    }

    async execute(robot) {
        try {
            const moveAction = await robot.createMoveAction({
                type: 'standard',
                target_x: this.params.x,
                target_y: this.params.y,
                target_z: this.params.z,
                target_ori: this.params.orientation,
                creator: `robot-interface-${robot.config.serialNumber}`
            });

            this.result = moveAction;
            this.status = 'completed';
            return moveAction;
        } catch (error) {
            this.error = error;
            this.status = 'failed';
            throw error;
        }
    }
}

class MoveToChargerAction extends RobotAction {
    constructor() {
        super('moveToCharger');
    }

    async execute(robot) {
        try {
            const chargerPose = await robot.getChargerPose();
            const moveAction = await robot.createMoveAction({
                type: 'standard',
                target_x: chargerPose.x,
                target_y: chargerPose.y,
                target_z: chargerPose.z || 0,
                target_ori: chargerPose.orientation || null,
                creator: `robot-interface-${robot.config.serialNumber}`
            });

            this.result = moveAction;
            this.status = 'completed';
            return moveAction;
        } catch (error) {
            this.error = error;
            this.status = 'failed';
            throw error;
        }
    }
}

// Utility Actions
class WaitAction extends RobotAction {
    constructor(duration) {
        super('wait', { duration });
    }

    async execute(robot) {
        return new Promise(resolve => {
            setTimeout(() => {
                this.status = 'completed';
                resolve();
            }, this.params.duration);
        });
    }
}

class CheckPointAction extends RobotAction {
    constructor(pointName, mapId) {
        super('checkPoint', { pointName, mapId });
    }

    async execute(robot) {
        try {
            const point = await robot.getPointByName(this.params.mapId, this.params.pointName);
            if (!point) {
                throw new Error(`Point ${this.params.pointName} not found in map ${this.params.mapId}`);
            }
            this.result = point;
            this.status = 'completed';
            return point;
        } catch (error) {
            this.error = error;
            this.status = 'failed';
            throw error;
        }
    }
}

// Composite Actions
class SequentialAction extends RobotAction {
    constructor(actions) {
        super('sequential', { actions });
    }

    async execute(robot) {
        try {
            const results = [];
            for (const action of this.params.actions) {
                const result = await action.execute(robot);
                results.push(result);
                if (action.status === 'failed') {
                    throw new Error(`Action ${action.name} failed: ${action.error}`);
                }
            }
            this.result = results;
            this.status = 'completed';
            return results;
        } catch (error) {
            this.error = error;
            this.status = 'failed';
            throw error;
        }
    }
}

class ParallelAction extends RobotAction {
    constructor(actions) {
        super('parallel', { actions });
    }

    async execute(robot) {
        try {
            const results = await Promise.all(
                this.params.actions.map(action => action.execute(robot))
            );
            this.result = results;
            this.status = 'completed';
            return results;
        } catch (error) {
            this.error = error;
            this.status = 'failed';
            throw error;
        }
    }
}

class ConditionalAction extends RobotAction {
    constructor(condition, ifAction, elseAction = null) {
        super('conditional', { condition, ifAction, elseAction });
    }

    async execute(robot) {
        try {
            const conditionResult = await this.params.condition(robot);
            const actionToExecute = conditionResult ? this.params.ifAction : this.params.elseAction;
            
            if (actionToExecute) {
                const result = await actionToExecute.execute(robot);
                this.result = result;
                this.status = 'completed';
                return result;
            } else {
                this.status = 'completed';
                return null;
            }
        } catch (error) {
            this.error = error;
            this.status = 'failed';
            throw error;
        }
    }
}

module.exports = {
    RobotAction,
    MoveToPointAction,
    MoveToCoordinatesAction,
    MoveToChargerAction,
    WaitAction,
    CheckPointAction,
    SequentialAction,
    ParallelAction,
    ConditionalAction
}; 