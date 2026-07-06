/**
 * GOOGLE APPS SCRIPT PARA RESERVAS DE LA COMUNA
 * 
 * INSTRUCCIONES:
 * 1. Abre tu hoja de cálculo de Google Sheets.
 * 2. Ve al menú superior "Extensiones" > "Apps Script".
 * 3. Borra todo el código del editor y pega este script.
 * 4. Guarda el proyecto (clic en el icono de guardar).
 * 5. Haz clic en "Implementar" (botón azul arriba a la derecha) > "Nueva implementación".
 * 6. Selecciona el tipo "Aplicación web".
 * 7. Configura:
 *    - Descripción: Versión 1
 *    - Ejecutar como: Tú (tu cuenta de Google)
 *    - Quién tiene acceso: "Cualquier persona" (es crucial para que la web pueda enviar reservas sin login).
 * 8. Haz clic en "Implementar" y autoriza los permisos requeridos.
 * 9. Copia la "URL de la aplicación web" que te proporciona y pégala en la constante
 *    `APPS_SCRIPT_URL` dentro del archivo `js/main.js` de tu sitio web.
 */

function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var params = e.parameter;
  
  // Soporte por si los datos llegan en el cuerpo como JSON
  if (e.postData && e.postData.contents) {
    try {
      params = JSON.parse(e.postData.contents);
    } catch(err) {}
  }
  
  var cellNum = params["Numero de Celda"] || params.cellNum;
  var nombre = params["Nombre"] || params.nombre;
  var apellido = params["Apellido"] || params.apellido;
  var telefono = params["Telefono"] || params.telefono;
  var estado = "Reservado"; // Estado por defecto al reservar desde la web
  
  if (!cellNum || !nombre || !apellido) {
    return createJsonResponse("error", "Faltan campos obligatorios (Número de celda, Nombre o Apellido)");
  }
  
  cellNum = parseInt(cellNum, 10);
  if (isNaN(cellNum) || cellNum < 1 || cellNum > 625) {
    return createJsonResponse("error", "Número de celda inválido");
  }
  
  // Limpieza de inputs
  nombre = nombre.toString().trim();
  apellido = apellido.toString().trim();
  telefono = telefono ? telefono.toString().trim() : "";
  
  // Bloquear accesos simultáneos mediante lock
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000); // Esperar hasta 10 segundos
  } catch (err) {
    return createJsonResponse("error", "El servidor está ocupado, inténtalo de nuevo.");
  }
  
  try {
    var data = sheet.getDataRange().getValues();
    var headers = data[0];
    
    // Buscar si ya existe una fila con este número de celda
    var cellColumnIndex = headers.indexOf("Numero de Celda");
    var estadoColumnIndex = headers.indexOf("Estado");
    
    if (cellColumnIndex === -1 || estadoColumnIndex === -1) {
      lock.releaseLock();
      return createJsonResponse("error", "Estructura de la hoja incorrecta. Verifica las columnas (Numero de Celda, Estado).");
    }
    
    var rowIndex = -1;
    for (var i = 1; i < data.length; i++) {
      if (parseInt(data[i][cellColumnIndex], 10) === cellNum) {
        rowIndex = i + 1; // 1-based index para la hoja de cálculo
        var currentEstado = data[i][estadoColumnIndex];
        if (currentEstado === "Reservado" || currentEstado === "Asignado") {
          lock.releaseLock();
          return createJsonResponse("error", "La parcela #" + cellNum + " ya se encuentra reservada o asignada.");
        }
        break;
      }
    }
    
    if (rowIndex !== -1) {
      // Si la celda existe pero estaba libre, actualizamos la fila existente
      // Columnas: Numero de Celda (1), Nombre (2), Apellido (3), Estado (4), Telefono (5)
      sheet.getRange(rowIndex, headers.indexOf("Nombre") + 1).setValue(nombre);
      sheet.getRange(rowIndex, headers.indexOf("Apellido") + 1).setValue(apellido);
      sheet.getRange(rowIndex, headers.indexOf("Estado") + 1).setValue(estado);
      sheet.getRange(rowIndex, headers.indexOf("Telefono") + 1).setValue(telefono);
    } else {
      // Si no existe, simplemente añadimos una fila nueva al final de la hoja
      // Construimos el array respetando el orden de las columnas del header
      var newRow = new Array(headers.length);
      newRow[headers.indexOf("Numero de Celda")] = cellNum;
      newRow[headers.indexOf("Nombre")] = nombre;
      newRow[headers.indexOf("Apellido")] = apellido;
      newRow[headers.indexOf("Estado")] = estado;
      newRow[headers.indexOf("Telefono")] = telefono;
      
      sheet.appendRow(newRow);
    }
    
    lock.releaseLock();
    return createJsonResponse("success", "¡Reserva de la parcela #" + cellNum + " completada con éxito!");
    
  } catch (error) {
    lock.releaseLock();
    return createJsonResponse("error", "Error interno en Google Sheets: " + error.toString());
  }
}

// Retorna un JSON limpio compatible con redirecciones CORS de Apps Script
function createJsonResponse(status, message) {
  var output = JSON.stringify({
    status: status,
    message: message
  });
  return ContentService.createTextOutput(output).setMimeType(ContentService.MimeType.JSON);
}

// Endpoint GET opcional que también admite escrituras via GET para evitar CORS
function doGet(e) {
  var params = e.parameter;
  // Si contiene parámetros de reserva, delegamos a doPost
  if (params && (params["Nombre"] || params.nombre || params["Numero de Celda"] || params.cellNum)) {
    return doPost(e);
  }
  
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data = sheet.getDataRange().getValues();
    var headers = data[0];
    var rows = [];
    
    for (var i = 1; i < data.length; i++) {
      var row = {};
      var isEmpty = true;
      for (var j = 0; j < headers.length; j++) {
        var header = headers[j];
        var val = data[i][j];
        if (val !== "") isEmpty = false;
        
        // El teléfono NO se envía en el GET por seguridad e información interna
        if (header !== "Telefono") {
          row[header] = val;
        }
      }
      if (!isEmpty) {
        rows.push(row);
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify(rows)).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return createJsonResponse("error", error.toString());
  }
}
