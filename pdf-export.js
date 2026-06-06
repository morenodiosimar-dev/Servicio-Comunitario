function obtenerFechaReporte() {
    return new Date().toLocaleString('es-VE', { dateStyle: 'long', timeStyle: 'short' });
}

function crearPdfBase(titulo) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    doc.setFillColor(16, 67, 88);
    doc.rect(0, 0, 210, 35, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.text('Gestión Social', 14, 15);
    doc.setFontSize(12);
    doc.text(titulo, 14, 25);
    doc.setFontSize(9);
    doc.text(`Generado: ${obtenerFechaReporte()}`, 14, 31);

    return doc;
}

function descargarPdf(doc, nombreArchivo) {
    doc.save(nombreArchivo);
}

function toNum(valor) {
    const n = Number(valor);
    return Number.isFinite(n) ? n : 0;
}

function estiloTabla(startY) {
    return {
        startY: startY ?? 42,
        headStyles: {
            fillColor: [16, 67, 88],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
        },
        alternateRowStyles: { fillColor: [245, 248, 250] },
        styles: { fontSize: 9, cellPadding: 3 },
        margin: { left: 14, right: 14 },
    };
}

function formatearCantidadesCompra(compra) {
    const partes = [];
    if (compra.cant_10kg) partes.push(`${compra.cant_10kg}x10kg`);
    if (compra.cant_18kg) partes.push(`${compra.cant_18kg}x18kg`);
    if (compra.cant_27kg) partes.push(`${compra.cant_27kg}x27kg`);
    if (compra.cant_43kg) partes.push(`${compra.cant_43kg}x43kg`);
    return partes.length > 0 ? partes.join(', ') : '-';
}

async function agregarTablaCompradoresPdf(doc, calleFiltro, periodoDias, startY) {
    let url = `/bombonas/historial-ventas?periodo=${periodoDias}`;
    if (calleFiltro) {
        url += `&calle=${encodeURIComponent(calleFiltro)}`;
    }

    const response = await fetch(url);
    const data = await response.json();
    const compradores = data.historial || [];

    doc.setFontSize(11);
    doc.setTextColor(16, 67, 88);
    doc.text(`Personas que compraron (últimos ${periodoDias} días)`, 14, startY);

    if (compradores.length === 0) {
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        doc.text('No hay compradores registrados en este periodo.', 14, startY + 6);
        return;
    }

    const body = compradores.map((compra) => [
        compra.cedula || '-',
        `${compra.nombre || ''} ${compra.apellido || ''}`.trim(),
        compra.calle || '-',
        formatearCantidadesCompra(compra),
        `${parseFloat(compra.monto_pagado || 0).toFixed(2)} Bs.`,
        compra.metodo_pago || '-',
        new Date(compra.fecha_pago).toLocaleString('es-VE'),
    ]);

    doc.autoTable({
        ...estiloTabla(startY + 5),
        head: [['Cédula', 'Beneficiario', 'Calle', 'Cantidades', 'Monto', 'Método', 'Fecha']],
        body,
        columnStyles: {
            0: { cellWidth: 22 },
            1: { cellWidth: 32 },
            2: { cellWidth: 20 },
            3: { cellWidth: 28 },
            4: { halign: 'right', cellWidth: 22 },
            5: { cellWidth: 22 },
            6: { cellWidth: 32 },
        },
    });
}

async function descargarPdfEstadisticasCalles(calleFiltro) {
    try {
        const response = await fetch('/bombonas/estadisticas-calles');
        const data = await response.json();

        let estadisticas = data.estadisticas || [];
        if (calleFiltro) {
            estadisticas = estadisticas.filter((est) => est.calle === calleFiltro);
        }

        if (estadisticas.length === 0) {
            alert('No hay datos de estadísticas por calle para exportar.');
            return;
        }

        const titulo = calleFiltro
            ? `Estadísticas por Calle — ${calleFiltro} — Inventario de Cilindros`
            : 'Estadísticas por Calle — Inventario de Cilindros';

        const doc = crearPdfBase(titulo);

        const body = estadisticas.map((est) => [
            est.calle,
            String(toNum(est.total_personas)),
            String(toNum(est.personas_con_registro)),
            String(toNum(est.total_cilindros)),
            String(toNum(est.total_10kg)),
            String(toNum(est.total_18kg)),
            String(toNum(est.total_27kg)),
            String(toNum(est.total_43kg)),
        ]);

        if (!calleFiltro) {
            const totales = estadisticas.reduce(
                (acc, est) => ({
                    personas: acc.personas + toNum(est.total_personas),
                    registro: acc.registro + toNum(est.personas_con_registro),
                    cilindros: acc.cilindros + toNum(est.total_cilindros),
                    kg10: acc.kg10 + toNum(est.total_10kg),
                    kg18: acc.kg18 + toNum(est.total_18kg),
                    kg27: acc.kg27 + toNum(est.total_27kg),
                    kg43: acc.kg43 + toNum(est.total_43kg),
                }),
                { personas: 0, registro: 0, cilindros: 0, kg10: 0, kg18: 0, kg27: 0, kg43: 0 }
            );

            body.push([
                'TOTAL',
                String(totales.personas),
                String(totales.registro),
                String(totales.cilindros),
                String(totales.kg10),
                String(totales.kg18),
                String(totales.kg27),
                String(totales.kg43),
            ]);
        }

        doc.autoTable({
            ...estiloTabla(),
            head: [['Calle', 'Personas', 'Con Registro', 'Cilindros', '10kg', '18kg', '27kg', '43kg']],
            body,
            footStyles: { fillColor: [21, 152, 149], textColor: [255, 255, 255], fontStyle: 'bold' },
        });

        const periodoDias = 15;
        const startYCompradores = doc.lastAutoTable.finalY + 12;
        await agregarTablaCompradoresPdf(doc, calleFiltro || null, periodoDias, startYCompradores);

        const fecha = new Date().toISOString().slice(0, 10);
        const sufijo = calleFiltro ? calleFiltro.replace(/\s+/g, '-').toLowerCase() : 'todas';
        descargarPdf(doc, `estadisticas-calles-${sufijo}-${fecha}.pdf`);
    } catch (error) {
        console.error('Error al generar PDF de estadísticas por calle:', error);
        alert('No se pudo generar el PDF. Intente de nuevo.');
    }
}

async function descargarPdfEstadisticasVentas(calleFiltro) {
    try {
        let url = '/bombonas/estadisticas-ventas-calles';
        if (calleFiltro) {
            url += `?calle=${encodeURIComponent(calleFiltro)}`;
        }

        const response = await fetch(url);
        const data = await response.json();

        if (!data.estadisticas || data.estadisticas.length === 0) {
            alert('No hay datos de ventas para exportar.');
            return;
        }

        const titulo = calleFiltro
            ? `Estadísticas de Ventas — ${calleFiltro} `
            : 'Estadísticas de Ventas por Calle ';

        const doc = crearPdfBase(titulo);

        const body = data.estadisticas.map((est) => [
            est.calle,
            String(est.total_bombonas || 0),
            `${est.total_10kg || 0} (${parseFloat(est.monto_10kg || 0).toFixed(2)} Bs.)`,
            `${est.total_18kg || 0} (${parseFloat(est.monto_18kg || 0).toFixed(2)} Bs.)`,
            `${est.total_27kg || 0} (${parseFloat(est.monto_27kg || 0).toFixed(2)} Bs.)`,
            `${est.total_43kg || 0} (${parseFloat(est.monto_43kg || 0).toFixed(2)} Bs.)`,
            `${parseFloat(est.total_monto || 0).toFixed(2)} Bs.`,
        ]);

        const totales = data.estadisticas.reduce(
            (acc, est) => ({
                bombonas: acc.bombonas + toNum(est.total_bombonas),
                kg10: acc.kg10 + toNum(est.total_10kg),
                m10: acc.m10 + toNum(est.monto_10kg),
                kg18: acc.kg18 + toNum(est.total_18kg),
                m18: acc.m18 + toNum(est.monto_18kg),
                kg27: acc.kg27 + toNum(est.total_27kg),
                m27: acc.m27 + toNum(est.monto_27kg),
                kg43: acc.kg43 + toNum(est.total_43kg),
                m43: acc.m43 + toNum(est.monto_43kg),
                monto: acc.monto + toNum(est.total_monto),
            }),
            { bombonas: 0, kg10: 0, m10: 0, kg18: 0, m18: 0, kg27: 0, m27: 0, kg43: 0, m43: 0, monto: 0 }
        );

        if (!calleFiltro) {
            body.push([
                'TOTAL',
                String(totales.bombonas),
                `${totales.kg10} (${totales.m10.toFixed(2)} Bs.)`,
                `${totales.kg18} (${totales.m18.toFixed(2)} Bs.)`,
                `${totales.kg27} (${totales.m27.toFixed(2)} Bs.)`,
                `${totales.kg43} (${totales.m43.toFixed(2)} Bs.)`,
                `${totales.monto.toFixed(2)} Bs.`,
            ]);
        }

        doc.autoTable({
            ...estiloTabla(),
            head: [['Calle', 'Bombonas', '10kg', '18kg', '27kg', '43kg', 'Total Recaudado']],
            body,
            columnStyles: {
                0: { cellWidth: 28 },
                6: { halign: 'right' },
            },
        });

        const periodoDias = data.periodo_dias || 15;
        const startYCompradores = doc.lastAutoTable.finalY + 12;
        await agregarTablaCompradoresPdf(doc, calleFiltro, periodoDias, startYCompradores);

        const fecha = new Date().toISOString().slice(0, 10);
        const sufijo = calleFiltro ? calleFiltro.replace(/\s+/g, '-').toLowerCase() : 'todas';
        descargarPdf(doc, `estadisticas-ventas-${sufijo}-${fecha}.pdf`);
    } catch (error) {
        console.error('Error al generar PDF de estadísticas de ventas:', error);
        alert('No se pudo generar el PDF. Intente de nuevo.');
    }
}

function descargarPdfEstadisticasVentasMiCalle() {
    const datosSesion = sessionStorage.getItem('usuario');
    const usuarioLogueado = datosSesion ? JSON.parse(datosSesion) : null;
    if (!usuarioLogueado || !usuarioLogueado.calle) {
        alert('No se encontró la calle asignada a su usuario.');
        return;
    }
    descargarPdfEstadisticasVentas(usuarioLogueado.calle);
}

function descargarPdfEstadisticasCallesMiCalle() {
    const datosSesion = sessionStorage.getItem('usuario');
    const usuarioLogueado = datosSesion ? JSON.parse(datosSesion) : null;
    if (!usuarioLogueado || !usuarioLogueado.calle) {
        alert('No se encontró la calle asignada a su usuario.');
        return;
    }
    descargarPdfEstadisticasCalles(usuarioLogueado.calle);
}
