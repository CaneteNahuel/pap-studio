# PAP Studio — Planeación Agregada de Producción
**PAP Studio** es una aplicación web interactiva y de código abierto diseñada para modelar, simular y optimizar planes agregados de producción (PAP) en entornos industriales y académicos.
Permite evaluar y comparar en tiempo real las estrategias tácticas clásicas (**Caza** y **Nivelado**) frente a un modelo matemático de **Programación Lineal (LP)** resuelto íntegramente en el navegador sin dependencias de backend.
---
## Características Principales
* **Motor Matemático Propio (`solver.js`):**
  * **Estrategia de Caza:** Ajuste periodo a periodo de la plantilla respetando pisos de personal fijo ($W_{\text{mín}}$), topes por turnos ($W_{\text{máx}}$) y políticas de no despido.
  * **Estrategia Nivelada:** Cálculo de plantilla constante para todo el horizonte con un único ajuste inicial, repartiendo la producción según los días productivos de cada periodo y absorbiendo la estacionalidad con inventario.
  * **Estrategia Optimizada (LP):** Implementación nativa del **Método Simplex de Dos Fases** con redondeo entero opcional de operarios y ajuste de factibilidad.
* **Restricciones Operativas Reales:** Soporte para personal permanente vs. eventual, prohibición de despidos global o por periodo, stock de seguridad fijo o porcentual, límite de horas extras, subcontratación, pedidos pendientes/comprometidos, retrasos (*backorders*) y capacidad de máquina.
* **Visualización e Inspección:** Gráficos interactivos en Canvas (balance de capacidad vs. demanda y comparativa de costos) y pestaña de metodología renderizada con **KaTeX**.
* **Exportación Profesional:**
  * Exportación a plantilla visual de cátedra en formato **`.xls`** compatible con Excel.
  * Generación de **Informe Ejecutivo en PDF** (`.pdf`) mediante **jsPDF** y **jsPDF-AutoTable**.
---
## Estructura del Proyecto
El proyecto está construido con **Vanilla JavaScript, HTML5 y CSS3** sin necesidad de procesos de compilación (*zero-build*), utilizando únicamente librerías externas vía CDN (KaTeX, jsPDF y Google Fonts):
```text
├── index.html   # Interfaz principal, modales, pestañas y sección metodológica
├── styles.css   # Sistema de diseño industrial responsivo y reglas de impresión
├── solver.js    # Motor matemático: Simplex de dos fases, heurísticas y evaluador de costos
└── app.js       # Controlador de estado, gráficos Canvas interactivos y exportadores
```
---
## Uso Local
Clona el repositorio y abre `index.html` directamente en tu navegador (o sírvelo con cualquier servidor estático como `npx serve` o Live Server).
## Contribuciones y Licencia
Las contribuciones, reportes de errores y mejoras son bienvenidos mediante *Issues* y *Pull Requests*.
