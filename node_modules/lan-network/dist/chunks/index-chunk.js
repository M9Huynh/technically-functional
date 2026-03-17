var e = require("child_process");

var t = require("node:crypto");

var r = require("node:dgram");

var s = require("node:os");

var n = require("dgram");

const o = {
  iname: "lo0",
  address: "127.0.0.1",
  netmask: "255.0.0.0",
  family: "IPv4",
  mac: "00:00:00:00:00:00",
  internal: !0,
  cidr: "127.0.0.1/8",
  gateway: null
};

const parseMacStr = e => e.split(":").slice(0, 16).map((e => parseInt(e, 16)));

const parseIpStr = e => {
  const t = e.split(".").slice(0, 4).map((e => parseInt(e, 10)));
  return t[3] | t[2] << 8 | t[1] << 16 | t[0] << 24;
};

const getSubnetPriority = e => {
  if (e.startsWith("192.")) {
    return 5;
  } else if (e.startsWith("172.")) {
    return 4;
  } else if (e.startsWith("10.")) {
    return 3;
  } else if (e.startsWith("100.")) {
    return 2;
  } else if (e.startsWith("127.")) {
    return 1;
  } else {
    return 0;
  }
};

const isInternal = e => {
  if (e.internal) {
    return !0;
  }
  const t = parseMacStr(e.mac);
  if (t.every((e => !e))) {
    return !0;
  } else if (0 === t[0] && 21 === t[1] && 93 === t[2]) {
    return !0;
  } else if (e.iname.includes("vEthernet") || /^bridge\d+$/.test(e.iname)) {
    return !0;
  } else {
    return !1;
  }
};

const interfaceAssignments = () => {
  const e = [];
  const t = s.networkInterfaces();
  for (const r in t) {
    const s = t[r];
    if (!s) {
      continue;
    }
    for (const t of s) {
      if ("IPv4" !== t.family) {
        continue;
      }
      e.push({
        ...t,
        iname: r
      });
    }
  }
  return e.sort(((e, t) => {
    const r = getSubnetPriority(e.address);
    const s = getSubnetPriority(t.address);
    return +isInternal(e) - +isInternal(t) || s - r || parseIpStr(t.address) - parseIpStr(e.address);
  }));
};

const matchAssignment = (e, t) => {
  const r = parseIpStr(t);
  for (const s of e) {
    const e = parseIpStr(s.address);
    if (r === e) {
      return {
        ...s,
        gateway: null
      };
    }
    const n = parseIpStr(s.netmask);
    if ((r & n) == (e & n)) {
      return {
        ...s,
        gateway: t
      };
    }
  }
  return null;
};

class DHCPTimeoutError extends TypeError {
  code="ETIMEDOUT";
}

const dhcpDiscover = e => new Promise(((s, n) => {
  const o = (e => (e => {
    const t = 255;
    let r = "";
    r += `${(e >>> 24 & t).toString(10)}.`;
    r += `${(e >>> 16 & t).toString(10)}.`;
    r += `${(e >>> 8 & t).toString(10)}.`;
    r += (e & t).toString(10);
    return r;
  })(parseIpStr(e.address) | ~parseIpStr(e.netmask)))(e);
  const c = (e => {
    const r = new Uint8Array(16);
    r.set(parseMacStr(e));
    const s = new Uint8Array(244);
    const n = t.randomBytes(4);
    s[0] = 1;
    s[1] = 1;
    s[2] = 6;
    s[3] = 0;
    s.set(n, 4);
    s[10] = 128;
    s.set(r, 28);
    s.set([ 99, 130, 83, 99 ], 236);
    s.set([ 53, 1, 1, 255 ], 240);
    return s;
  })(e.mac);
  const a = setTimeout((() => {
    n(new DHCPTimeoutError("Received no reply to DHCPDISCOVER in 250ms"));
  }), 250);
  const i = r.createSocket({
    type: "udp4",
    reuseAddr: !0
  }, ((t, r) => {
    if (!((e, t, r) => {
      const s = parseIpStr(e);
      const n = parseIpStr(t);
      const o = parseIpStr(r);
      return (s & o) == (n & o);
    })(r.address, e.address, e.netmask)) {
      return;
    }
    clearTimeout(a);
    s(r.address);
    i.close();
    i.unref();
  }));
  i.on("error", (e => {
    clearTimeout(a);
    n(e);
    i.close();
    i.unref();
  }));
  i.bind(68, (() => {
    i.setBroadcast(!0);
    i.setSendBufferSize(c.length);
    i.send(c, 0, c.length, 67, o, (e => {
      if (e) {
        n(e);
      }
    }));
  }));
}));

class DefaultRouteError extends TypeError {
  code="ECONNABORT";
}

const probeDefaultRoute = () => new Promise(((e, t) => {
  const r = n.createSocket({
    type: "udp4",
    reuseAddr: !0
  });
  r.on("error", (e => {
    t(e);
    r.close();
    r.unref();
  }));
  r.connect(53, "1.1.1.1", (() => {
    const s = r.address();
    if (s && "address" in s && "0.0.0.0" !== s.address) {
      e(s.address);
    } else {
      t(new DefaultRouteError("No route to host"));
    }
    r.close();
    r.unref();
  }));
}));

exports.DEFAULT_ASSIGNMENT = o;

exports.dhcpDiscover = dhcpDiscover;

exports.interfaceAssignments = interfaceAssignments;

exports.lanNetwork = async function lanNetwork(e) {
  const t = interfaceAssignments();
  if (!t.length) {
    return o;
  }
  let r;
  if (!e?.noProbe) {
    try {
      const e = await probeDefaultRoute();
      if ((r = matchAssignment(t, e)) && !isInternal(r)) {
        return r;
      }
    } catch {}
  }
  if (!e?.noDhcp) {
    const e = await Promise.allSettled(t.map((e => dhcpDiscover(e))));
    for (const s of e) {
      if ("fulfilled" === s.status && s.value) {
        if (r = matchAssignment(t, s.value)) {
          return r;
        }
      }
    }
  }
  return {
    ...t[0],
    gateway: null
  };
};

exports.lanNetworkSync = function lanNetworkSync(t) {
  const r = require.resolve("lan-network/subprocess");
  const {error: s, status: n, stdout: c} = e.spawnSync(process.execPath, [ r, t?.noProbe ? "--no-probe" : null, t?.noDhcp ? "--no-dhcp" : null ].filter((e => !!e)), {
    shell: !1,
    timeout: 500,
    encoding: "utf8",
    windowsVerbatimArguments: !1,
    windowsHide: !0
  });
  if (n || s) {
    return o;
  } else if (!n && "string" == typeof c) {
    const e = JSON.parse(c.trim());
    return "object" == typeof e && e && "address" in e ? e : o;
  } else {
    return o;
  }
};

exports.matchAssignment = matchAssignment;

exports.probeDefaultRoute = probeDefaultRoute;
//# sourceMappingURL=index-chunk.js.map
