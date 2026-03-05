# GestorPréstamos - TODO

## Base de datos y backend
- [x] Esquema DB: tabla clientes (borrowers)
- [x] Esquema DB: tabla préstamos (loans)
- [x] Esquema DB: tabla pagos (payments)
- [x] Esquema DB: tabla tabla de amortización (amortization_schedule)
- [x] Migración DB con pnpm db:push
- [x] Helpers de DB para clientes, préstamos, pagos
- [x] Router tRPC: clientes (CRUD)
- [x] Router tRPC: préstamos (CRUD + cálculo de amortización)
- [x] Router tRPC: pagos (registro y seguimiento)
- [x] Router tRPC: dashboard (estadísticas y alertas)
- [x] Router tRPC: reportes (filtros por fecha/cliente/estado)
- [x] Lógica de interés simple e interés compuesto
- [x] Lógica de generación de tabla de amortización (semanal/quincenal/mensual)

## Frontend - Layout y autenticación
- [x] Estilos globales elegantes (paleta de colores, tipografía)
- [x] DashboardLayout con sidebar de navegación
- [x] Página de login / autenticación
- [x] Rutas protegidas

## Frontend - Dashboard
- [x] Tarjetas de resumen (préstamos activos, vencidos, cobros pendientes, total cobrado)
- [x] Gráfico de préstamos por estado
- [x] Lista de pagos próximos a vencer
- [x] Alertas de pagos vencidos

## Frontend - Clientes
- [x] Lista de clientes con búsqueda y filtros
- [x] Formulario crear/editar cliente
- [x] Perfil de cliente con historial de préstamos
- [x] Eliminar cliente

## Frontend - Préstamos
- [x] Lista de préstamos con filtros por estado
- [x] Formulario crear préstamo (monto, tasa, plazo, frecuencia, tipo de interés)
- [x] Vista detalle del préstamo con tabla de amortización
- [x] Cambio de estado del préstamo (activo/pagado/vencido)

## Frontend - Pagos
- [x] Registro de pago con fecha, monto y método
- [x] Historial de pagos por préstamo
- [x] Marcar cuota como pagada desde tabla de amortización

## Frontend - Reportes
- [x] Reporte de préstamos con filtros
- [x] Reporte de cobros/pagos con filtros
- [x] Historial completo de transacciones

## Pruebas
- [x] Tests vitest para lógica de amortización (9 tests)
- [x] Tests vitest para auth logout

## Mejoras - WhatsApp
- [x] Botón "Enviar recordatorio WhatsApp" en cuotas vencidas del dashboard
- [x] Botón "Enviar recordatorio WhatsApp" en cuotas próximas a vencer del dashboard
- [x] Botón WhatsApp en perfil del cliente
- [x] Mensaje pre-escrito con nombre, tipo de cuota y texto estándar

## Mejoras - Moneda
- [x] Cambiar moneda a Colón costarricense (₡) en formatCurrency y toda la app

## Mejoras - Seguro por Cuota
- [x] Agregar campo insuranceAmount (monto fijo) en tabla loans del schema DB
- [x] Agregar campo insuranceAmount en tabla schedule_items
- [x] Actualizar lógica de amortización para incluir seguro en cada cuota
- [x] Actualizar formulario Nuevo Préstamo con campo seguro opcional
- [x] Actualizar tabla de amortización en LoanDetail para mostrar columna seguro
- [x] Actualizar reportes con desglose de seguro vs capital vs interés
- [x] Migrar base de datos con pnpm db:push

## Correcciones y mejoras pendientes
- [x] Investigar y corregir error al crear préstamo (mensaje rojo aunque registra)
- [x] Verificar que todos los campos numéricos se envíen como number (no string) al servidor
- [x] Botón eliminar préstamo con confirmación
- [x] Botón eliminar cliente con confirmación
- [ ] Botón eliminar pago con confirmación
- [x] Corregir pagos de Xinia Soza: ₡55,000 debe ser SOLO capital, sin interés/seguro
- [x] Tabla de amortización no se despliega en todos los préstamos
- [ ] Agregar avisos de vencimiento por WhatsApp al número 70460451


## Nuevas funcionalidades - Edición y usuarios cliente
- [x] Botón editar préstamo en lista y detalle
- [x] Formulario editar préstamo (tasa, seguro, plazo)
- [x] Recalcular tabla de amortización al editar préstamo
- [ ] Sistema de roles: admin vs cliente
- [ ] Crear usuario para cliente desde perfil de cliente
- [ ] Página de login para clientes
- [ ] Dashboard cliente: ver solo su préstamo
- [ ] Perfil cliente: editar teléfono, email, dirección (solo lectura del préstamo)
- [ ] Proteger rutas: clientes no pueden ver otros préstamos
