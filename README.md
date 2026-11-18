# PAP Studio — Planeación Agregada de Producción

**PAP Studio** es una aplicación web interactiva y de código abierto diseñada para modelar, simular y optimizar planes agregados de producción (PAP) en entornos industriales y académicos.

Permite evaluar y comparar en tiempo real las estrategias tácticas clásicas (**Caza** y **Nivelado**) frente a un modelo matemático de **Optimización Entera Mixta (MILP)** resuelto íntegramente en el navegador sin dependencias de backend.

---

## Características Principales

* **Motor Matemático Propio (`solver.js`):**
  * **Estrategia de Caza:** Ajuste periodo a periodo de la plantilla respetando pisos de personal fijo ($W_{\text{mín}}$) y topes por turnos ($W_{\text{máx}}$).
  * **Estrategia Nivelada:** Cálculo de plantilla constante basado en demanda acumulada prefija para evitar rupturas de stock intermedias.
  * **Estrategia Optimizada (MILP):** Implementación nativa del **Método Simplex de Dos Fases** combinada con refinamiento entero sobre la trayectoria de operarios.
* **Restricciones Operativas Reales:** Soporte para personal permanente vs. eventual, prohibición de despidos por periodo, stock de seguridad fijo o porcentual, límite de horas extras, subcontratación y capacidad de máquina.
* **Exportación Profesional:**
  * Generación de libros **`.xlsx` nativos con fórmulas vivas de Excel** mediante SheetJS.
  * Exportación a plantilla visual de cátedra (`.xls`) e **Informe Ejecutivo en PDF** (`.pdf`) con jsPDF.
  * Guardado local de escenarios y exportación/importación en formato `.json`.

---

## Estructura del Proyecto

El proyecto está construido con **Vanilla JavaScript, HTML5 y CSS3** sin necesidad de procesos de compilación (*zero-build*):

```text
├── index.html   # Interfaz principal, modales y estructura de pestañas
├── styles.css   # Sistema de diseño industrial responsivo y reglas de impresión
├── solver.js    # Motor matemático: Simplex de dos fases, heurísticas y evaluador de costos
└── app.js       # Controlador de estado, gráficos Canvas interactivos y exportadores
