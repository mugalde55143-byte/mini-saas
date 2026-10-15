// Mini-SaaS de tareas multi-inquilino (multi-tenant)
// Una sola instancia de la aplicación atiende a varias empresas (inquilinos).
const http = require("http");
const crypto = require("crypto");

const PORT = process.env.PORT || 3000;

// Planes de suscripción: cada uno define un límite de uso
const PLANS = {
  free: { maxTasks: 5 },
  pro: { maxTasks: 1000 },
};

// "Base de datos" en memoria
const tenants = {}; // apiKey -> { id, company, plan }
const tasks = [];   // { id, tenantId, title, done }

function send(res, status, data) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      try { resolve(JSON.parse(body || "{}")); } catch { resolve(null); }
    });
  });
}

// Identifica al inquilino por su llave de API
function authenticate(req) {
  return tenants[req.headers["x-api-key"]] || null;
}

const server = http.createServer(async (req, res) => {
  // 1) Alta de un inquilino nuevo (registro de una empresa)
  if (req.method === "POST" && req.url === "/api/signup") {
    const body = await readBody(req);
    if (!body || typeof body.company !== "string" || body.company.trim() === "") {
      return send(res, 400, { error: "Envía company (texto)" });
    }
    const apiKey = crypto.randomBytes(16).toString("hex");
    const tenant = { id: crypto.randomUUID(), company: body.company.trim(), plan: "free" };
    tenants[apiKey] = tenant;
    return send(res, 201, { apiKey, ...tenant });
  }

  // A partir de aquí, toda ruta requiere una llave de API válida
  const tenant = authenticate(req);
  if (!tenant) return send(res, 401, { error: "Falta o es inválida la cabecera x-api-key" });

  // 2) Listar SOLO las tareas del inquilino que hace la petición
  if (req.method === "GET" && req.url === "/api/tasks") {
    return send(res, 200, tasks.filter((t) => t.tenantId === tenant.id));
  }

  // 3) Crear una tarea respetando el límite del plan
  if (req.method === "POST" && req.url === "/api/tasks") {
    const body = await readBody(req);
    if (!body || typeof body.title !== "string" || body.title.trim() === "") {
      return send(res, 400, { error: "Envía title (texto)" });
    }
    const used = tasks.filter((t) => t.tenantId === tenant.id).length;
    if (used >= PLANS[tenant.plan].maxTasks) {
      return send(res, 402, { error: `Límite del plan ${tenant.plan} alcanzado. Mejora tu plan.` });
    }
    const task = { id: tasks.length + 1, tenantId: tenant.id, title: body.title.trim(), done: false };
    tasks.push(task);
    return send(res, 201, task);
  }

  // 4) Consultar el uso actual frente al límite del plan
  if (req.method === "GET" && req.url === "/api/usage") {
    const used = tasks.filter((t) => t.tenantId === tenant.id).length;
    return send(res, 200, { company: tenant.company, plan: tenant.plan, used, limit: PLANS[tenant.plan].maxTasks });
  }

  send(res, 404, { error: "Ruta no encontrada" });
});

server.listen(PORT, () => console.log(`Mini-SaaS escuchando en el puerto ${PORT}`));
