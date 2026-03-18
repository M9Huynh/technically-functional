"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: all[name]
    });
}
_export(exports, {
    events: function() {
        return events;
    },
    installEventLogger: function() {
        return installEventLogger;
    },
    isEventLoggerActive: function() {
        return isEventLoggerActive;
    },
    rootEvent: function() {
        return rootEvent;
    },
    shouldReduceLogs: function() {
        return shouldReduceLogs;
    }
});
function _nodeconsole() {
    const data = require("node:console");
    _nodeconsole = function() {
        return data;
    };
    return data;
}
function _nodepath() {
    const data = /*#__PURE__*/ _interop_require_default(require("node:path"));
    _nodepath = function() {
        return data;
    };
    return data;
}
function _nodetty() {
    const data = require("node:tty");
    _nodetty = function() {
        return data;
    };
    return data;
}
const _stream = require("./stream");
const _env = require("../utils/env");
function _interop_require_default(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}
let logPath = process.cwd();
let logStream;
function parseLogTarget(env) {
    let logDestination;
    if (env) {
        const fd = parseInt(env, 10);
        if (fd > 0 && Number.isSafeInteger(fd)) {
            logDestination = fd;
        } else {
            try {
                const parsedPath = _nodepath().default.parse(env);
                logDestination = _nodepath().default.format(parsedPath);
                logPath = parsedPath.dir;
            } catch  {
                logDestination = undefined;
            }
        }
    }
    return logDestination;
}
function getInitMetadata() {
    return {
        format: 'v0-jsonl',
        // Version is added in the build script.
        version: "55.0.16" ?? 'UNVERSIONED'
    };
}
function installEventLogger(env = process.env.LOG_EVENTS) {
    const eventLogDestination = parseLogTarget(env);
    if (eventLogDestination) {
        if (eventLogDestination === 1) {
            const output = new (_nodetty()).WriteStream(2);
            Object.defineProperty(process, 'stdout', {
                get: ()=>output
            });
            globalThis.console = new (_nodeconsole()).Console(output, output);
        } else if (eventLogDestination === 2) {
            const output = new (_nodetty()).WriteStream(1);
            Object.defineProperty(process, 'stderr', {
                get: ()=>output
            });
            globalThis.console = new (_nodeconsole()).Console(output, output);
        }
        logStream = new _stream.LogStream(eventLogDestination);
        rootEvent('init', getInitMetadata());
    }
}
const isEventLoggerActive = ()=>!!(logStream == null ? void 0 : logStream.writable);
const shouldReduceLogs = ()=>!!logStream && _env.env.EXPO_UNSTABLE_HEADLESS;
const events = (category, _fn)=>{
    function log(event, data) {
        if (logStream) {
            const _e = `${category}:${String(event)}`;
            const _t = Date.now();
            const payload = JSON.stringify({
                _e,
                _t,
                ...data
            });
            logStream._write(payload + '\n');
        }
    }
    log.category = category;
    log.path = function relativePath(target) {
        try {
            return target != null && _nodepath().default.isAbsolute(target) ? _nodepath().default.relative(logPath, target).replace(/\\/, '/') || '.' : target ?? null;
        } catch  {
            return target || null;
        }
    };
    return log;
};
const rootEvent = events('root', (t)=>[
        t.event()
    ]);

//# sourceMappingURL=index.js.map