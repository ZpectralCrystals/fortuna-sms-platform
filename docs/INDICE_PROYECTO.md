# INDICE DEL PROYECTO

## Raiz del proyecto

Ubicacion base:

```text
/Volumes/MAC/MAC Ext/Desktop/Fortuna sms/
```

En la raiz quedan solo elementos principales:

- `sms/`: proyecto actual del portal cliente en React/Vite.
- `backoffice/`: proyecto actual del panel administrativo en React/Vite.
- `angular-workspace/`: nueva base Angular para migracion.
- `docs/`: documentacion, reportes, evidencias y presentaciones.
- `AGENTS.md`: instrucciones globales del repositorio.
- `.DS_Store`: archivo del sistema macOS.

## 00 - Planificacion

Ubicacion:

```text
docs/00-planificacion/
```

Contenido:

- `PLAN_MIGRACION_ANGULAR.md`: diagnostico inicial y propuesta de migracion Angular.
- `CAMBIOS_BASE_ANGULAR.md`: cambios realizados al crear la base Angular.
- `plan_tareas_sms_fortuna.md`: plan de tareas del proyecto.
- `plan_tareas_sms_fortuna.xlsx`: plan de tareas en formato Excel.

## 01 - Reportes QA

Ubicacion:

```text
docs/01-reportes-qa/
```

Contenido:

- `AUDITORIA_COMPLETA.md`: auditoria completa previa.
- `REPORTE_FUNCIONAL.md`: reporte funcional inicial.
- `REPORTE_FUNCIONAL_PRO.md`: reporte funcional profesional.
- `REPORTE_FUNCIONAL_CLIENTE.docx`: version Word para cliente.
- `REPORTE_FUNCIONAL_CLIENTE_V2.docx`: segunda version Word mejorada.
- `RESUMEN_EJECUTIVO_QA.docx`: resumen ejecutivo QA.
- `REPORTE_QA_SMS_VISUAL_Y_FUNCIONAL.md`: reporte QA visual y funcional del proyecto SMS.
- `REPORTE_QA_BACKOFFICE_VISUAL_Y_FUNCIONAL.md`: reporte QA visual y funcional del backoffice.

## 02 - Evidencias

Ubicacion:

```text
docs/02-evidencias/
```

Contenido:

- `sms/qa-sms-evidencia/`: capturas y evidencias del proyecto SMS.
- `backoffice/qa-backoffice-evidencia/`: capturas y evidencias del backoffice.
- `general/qa-evidencia/`: evidencias generales usadas en reportes previos.
- `general/qa-evidencia-docs-original/`: evidencias que ya existian dentro de `docs/qa-evidencia` antes del ordenamiento.
- `general/qa-tmp/`: carpeta temporal de evidencia sin `node_modules`.

Nota:

- `docs/qa_tmp/` queda fuera de la nueva estructura porque contiene `node_modules`. No se movio para cumplir regla de no tocar `node_modules`.

## 03 - Presentaciones

Ubicacion:

```text
docs/03-presentaciones/
```

Contenido:

- `PRESENTACION_QA.pptx`: presentacion QA en PowerPoint.
- `PRESENTACION_QA.pdf`: copia PDF de presentacion QA.

## 04 - Temporales

Ubicacion:

```text
docs/04-temporales/
```

Contenido:

- `duplicados-previos/`: archivos duplicados que ya existian dentro de `docs/` antes del ordenamiento. Se conservaron para no borrar nada.

## Criterio aplicado

- No se borro ningun archivo.
- No se modifico codigo fuente.
- No se movio `sms/`.
- No se movio `backoffice/`.
- No se movio `angular-workspace/`.
- No se modificaron `.env`.
- No se movieron carpetas que contienen `node_modules`.
- Archivos dudosos o de sistema quedaron sin cambios.
