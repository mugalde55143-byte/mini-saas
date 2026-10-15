# Mini-SaaS de tareas multi-inquilino

Código base para la práctica de SaaS. Una sola instancia de la aplicación atiende a varias empresas (inquilinos); cada una se identifica con su propia llave de API y solo ve sus datos.

No usa librerías externas: solo necesitas Node.js 20 o superior.

## Ejecutar en local

```bash
npm start
```

El servidor queda en `http://localhost:3000`.

## Rutas incluidas

| Método | Ruta | Requiere `x-api-key` | Qué hace |
| --- | --- | --- | --- |
| POST | `/api/signup` | No | Registra una empresa (plan `free`) y devuelve su llave de API |
| GET | `/api/tasks` | Sí | Lista solo las tareas de esa empresa |
| POST | `/api/tasks` | Sí | Crea una tarea si el plan lo permite (free = 5 tareas) |
| GET | `/api/usage` | Sí | Muestra uso actual y límite del plan |

## Probar con curl

En Windows usa `curl.exe` en lugar de `curl`, o bien Postman / Thunder Client.

```bash
# 1. Registrar dos empresas y guardar sus llaves
curl -X POST http://localhost:3000/api/signup -H "Content-Type: application/json" -d "{\"company\":\"Acme\"}"
curl -X POST http://localhost:3000/api/signup -H "Content-Type: application/json" -d "{\"company\":\"Globex\"}"

# 2. Crear una tarea con la llave de Acme
curl -X POST http://localhost:3000/api/tasks -H "Content-Type: application/json" -H "x-api-key: LLAVE_ACME" -d "{\"title\":\"Preparar demo\"}"

# 3. Comprobar el aislamiento: Globex no debe ver la tarea de Acme
curl http://localhost:3000/api/tasks -H "x-api-key: LLAVE_GLOBEX"

# 4. Consultar el uso del plan
curl http://localhost:3000/api/usage -H "x-api-key: LLAVE_ACME"
```

## Retos de la práctica

1. **Mejorar de plan:** `POST /api/upgrade` cambia el plan del inquilino a `pro` (simula el pago).
2. **Completar tareas:** `PATCH /api/tasks/:id` marca una tarea como completada. Si la tarea es de otro inquilino, responde 404.
3. **Exportar datos:** `GET /api/export` devuelve todas las tareas del inquilino en JSON (portabilidad de datos).
4. **Opcional, límite de peticiones:** máximo 30 peticiones por minuto por inquilino; al excederlo, responde 429.
