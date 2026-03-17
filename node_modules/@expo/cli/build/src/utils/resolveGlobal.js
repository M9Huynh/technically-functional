// NOTE: This file is replicated to multiple packages! Keep these files in-sync:
// - packages/@expo/cli/src/utils/resolveGlobal.ts
// - packages/@expo/image-utils/src/resolveGlobal.ts
"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "resolveGlobal", {
    enumerable: true,
    get: function() {
        return resolveGlobal;
    }
});
function _child_process() {
    const data = require("child_process");
    _child_process = function() {
        return data;
    };
    return data;
}
function _fs() {
    const data = /*#__PURE__*/ _interop_require_default(require("fs"));
    _fs = function() {
        return data;
    };
    return data;
}
function _module() {
    const data = /*#__PURE__*/ _interop_require_default(require("module"));
    _module = function() {
        return data;
    };
    return data;
}
function _os() {
    const data = /*#__PURE__*/ _interop_require_default(require("os"));
    _os = function() {
        return data;
    };
    return data;
}
function _path() {
    const data = /*#__PURE__*/ _interop_require_default(require("path"));
    _path = function() {
        return data;
    };
    return data;
}
function _interop_require_default(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}
const memoize = (fn)=>{
    let result;
    return (...args)=>{
        if (result === undefined) {
            result = {
                value: fn(...args)
            };
        }
        return result.value;
    };
};
const isWindows = process.platform === 'win32';
const getDelimitedPaths = (delimited)=>delimited.split(_path().default.delimiter).map((target)=>{
        try {
            const normalized = _path().default.normalize(target.trim());
            if (!normalized) {
                return null;
            } else if (!_path().default.isAbsolute(normalized)) {
                return _path().default.resolve(process.cwd(), normalized);
            } else {
                return normalized;
            }
        } catch  {
            return null;
        }
    }).filter((target)=>!!target);
const execGetPaths = (cmd, args)=>{
    const result = (0, _child_process().spawnSync)(cmd, args, {
        encoding: 'utf8'
    });
    if (!result.error && result.status === 0 && result.stdout) {
        const paths = getDelimitedPaths(result.stdout.replace(/[\r\n]+/g, _path().default.delimiter));
        return paths.filter((target)=>_fs().default.existsSync(target));
    }
    return [];
};
const getNativeNodePaths = ()=>{
    if (Array.isArray(_module().default.globalPaths)) {
        return _module().default.globalPaths;
    } else {
        return [];
    }
};
const getHomePath = memoize(()=>{
    try {
        return _os().default.homedir();
    } catch  {
        return isWindows ? process.env.UserProfile ?? process.env.USERPROFILE : process.env.HOME;
    }
});
const getNpmDefaultPaths = ()=>{
    const prefix = [];
    const localAppData = process.env.LocalAppData || process.env.LOCALAPPDATA;
    if (isWindows && localAppData) {
        prefix.push(_path().default.resolve(localAppData, 'npm'));
    } else if (!isWindows) {
        prefix.push('/usr/local/lib/node_modules');
    }
    return prefix.filter((target)=>_fs().default.existsSync(target));
};
const getNpmPrefixPaths = memoize(()=>{
    const npmPrefix = execGetPaths(isWindows ? 'npm.cmd' : 'npm', [
        'config',
        '-g',
        'get',
        'prefix'
    ]);
    return npmPrefix.map((prefix)=>_path().default.resolve(prefix, 'lib'));
});
const getYarnDefaultPaths = ()=>{
    const prefix = [];
    const homePath = getHomePath();
    const localAppData = process.env.LocalAppData || process.env.LOCALAPPDATA;
    const dataHomePath = process.env.XDG_DATA_HOME || homePath && _path().default.join(homePath, '.local', 'share');
    if (isWindows && localAppData) {
        prefix.push(_path().default.resolve(localAppData, 'Yarn', 'global'));
    }
    if (dataHomePath) {
        prefix.push(_path().default.resolve(dataHomePath, 'yarn', 'global'));
    }
    if (homePath) {
        prefix.push(_path().default.resolve(homePath, '.yarn', 'global'));
    }
    return prefix.filter((target)=>_fs().default.existsSync(target));
};
const getYarnPrefixPaths = memoize(()=>{
    return execGetPaths(isWindows ? 'yarn.cmd' : 'yarn', [
        'global',
        'dir'
    ]);
});
const getPnpmPrefixPaths = memoize(()=>{
    return execGetPaths(isWindows ? 'pnpm.cmd' : 'pnpm', [
        'root',
        '-g'
    ]);
});
const getBunPrefixPaths = memoize(()=>{
    const prefix = [];
    const bunPath = execGetPaths(isWindows ? 'bun.cmd' : 'bun', [
        'pm',
        'bin',
        '-g'
    ])[0];
    if (!bunPath) {
        return [];
    }
    prefix.push(_path().default.resolve(bunPath, 'global'));
    const moduleEntry = _fs().default.readdirSync(bunPath, {
        withFileTypes: true
    }).find((entry)=>{
        return entry.isSymbolicLink() && entry.name !== 'global';
    });
    if (moduleEntry) {
        try {
            const moduleTarget = _fs().default.realpathSync(_path().default.resolve(bunPath, moduleEntry.name));
            const splitIdx = moduleTarget.indexOf(_path().default.sep + 'node_modules' + _path().default.sep);
            if (splitIdx > -1) {
                const modulePath = moduleTarget.slice(0, splitIdx);
                prefix.push(modulePath);
            }
        } catch  {}
    }
    return prefix.filter((target)=>_fs().default.existsSync(target));
});
const getPaths = ()=>[
        ...getNpmDefaultPaths(),
        ...getNpmPrefixPaths(),
        ...getYarnDefaultPaths(),
        ...getYarnPrefixPaths(),
        ...getPnpmPrefixPaths(),
        ...getBunPrefixPaths(),
        ...getNativeNodePaths(),
        process.cwd()
    ];
const resolveGlobal = (id)=>{
    return require.resolve(id, {
        paths: getPaths()
    });
};

//# sourceMappingURL=resolveGlobal.js.map