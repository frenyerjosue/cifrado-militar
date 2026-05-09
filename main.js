const { app, BrowserWindow, ipcMain, dialog} = require('electron');
const path = require('path');
const { machineIdSync } = require('node-machine-id');
const { autoUpdater } = require('electron-updater');
const { supabase } = require('./js/database.js');

function createWindow () {
  // Configuración de la ventana táctica
  const win = new BrowserWindow({
    width: 800,
    height: 700,
    backgroundColor: '#1a1e18', // Fondo oscuro para que no haya destellos blancos al abrir
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  })

  // Cargar tu archivo HTML principal
  win.loadFile('indexv2.html')
  
  // Opcional: Quitar el menú superior por defecto para un look más limpio
  win.setMenuBarVisibility(false) 

  // 1. Evitar que se abra la consola con atajos de teclado
    win.webContents.on('before-input-event', (event, input) => {
        // Bloquear F12
        if (input.key === 'F12') {
            event.preventDefault();
        }
        // Bloquear Ctrl + Shift + I
        if (input.control && input.shift && input.key.toLowerCase() === 'i') {
            event.preventDefault();
        }
    });

    // 2. Si por algún milagro logran abrirla, la cerramos instantáneamente
    win.webContents.on('devtools-opened', () => {
        win.webContents.closeDevTools();
        // Opcional: Castigar al usuario cerrando la app si intenta hackearla
        // app.quit(); 
    });

    autoUpdater.checkForUpdatesAndNotify();
}

autoUpdater.on('update-available', () => {
    console.log('¡Actualización detectada! Descargando...');
});

autoUpdater.on('update-downloaded', () => {
    console.log('Descarga terminada. Se instalará al cerrar la app.');
    // También podrías enviar un mensaje al frontend para mostrarle un botón de "Reiniciar ahora"
});

autoUpdater.on('update-available', () => {
    dialog.showMessageBox({
        type: 'info',
        title: 'ENCRIPTS - Sistema de Actualización',
        message: 'Descargando nuevas actualizaciones en segundo plano',
        buttons: ['Entendido']
    });
});

// 2. Cuando la descarga del .exe ha finalizado y está lista para instalarse
autoUpdater.on('update-downloaded', () => {
    dialog.showMessageBox({
        type: 'question',
        title: 'Actualización Lista',
        message: 'Las actualizaciones han sido descargadas con éxito.\n\n¿Desea reiniciar el sistema para aplicarlas ahora?',
        buttons: ['Reiniciar Ahora', 'Más Tarde'],
        defaultId: 0, // El botón resaltado por defecto
        cancelId: 1   // Qué hace si cierran la ventana con la X
    }).then((result) => {
        // Si el usuario hace clic en el botón 0 ('Reiniciar Ahora')
        if (result.response === 0) {
            autoUpdater.quitAndInstall(); // Cierra la app e instala la nueva versión
        }
    });
});

// (Opcional pero recomendado) Por si ocurre algún corte de internet durante la descarga
autoUpdater.on('error', (error) => {
    console.error('Error en el actualizador:', error);
});

// --- PROTOCOLO DE INTERCOMUNICACIÓN (BACKEND) ---
ipcMain.handle('iniciar-verificacion', async (event, claveIngresada) => {
    try {
        // Extraemos el ADN del equipo actual
        const miHWID = machineIdSync();

        // 1. Buscamos la clave en la base de datos de Supabase
        let { data: licencia, error } = await supabase
            .from('LICENCIAS')
            .select('*')
            .eq('codigo_licencia', claveIngresada.trim().toUpperCase())
            .single(); 

        // Si hay error o no existe
        if (error || !licencia) {
            return { accesoConcedido: false, mensajeError: "CLAVE INVALIDA" };
        }

        // Si la licencia fue desactivada manualmente por ti
        if (!licencia.estado) {
            return { accesoConcedido: false, mensajeError: "LICENCIA VENCIDA" };
        }

        // 2. Lógica de Vinculación de Hardware
        if (licencia.hwid_vinculado === null) {
            // LICENCIA VIRGEN: La vinculamos a esta PC para siempre
            const { error: updateError } = await supabase
                .from('LICENCIAS')
                .update({ hwid_vinculado: miHWID })
                .eq('codigo_licencia', claveIngresada);
            if (updateError) return { accesoConcedido: false, mensajeError: "ERROR AL ESCRIBIR CREDENCIALES EN BASE DE DATOS "};
            
            // Acceso concedido y devolvemos el HWID para que el frontend lo guarde
            return { accesoConcedido: true, hwidAprobado: miHWID }; 
        } 
        else if (licencia.hwid_vinculado === miHWID) {
            // LA CLAVE YA ESTÁ VINCULADA, Y COINCIDE CON ESTA PC (Todo en orden)
            return { accesoConcedido: true, hwidAprobado: miHWID };
        } 
        else {
            // LA CLAVE ESTÁ VINCULADA A OTRA PC (Intento de piratería)
            return { accesoConcedido: false, mensajeError: "VIOLACIÓN DE SEGURIDAD: CLAVE ASIGNADA EN OTRO DISPOSITIVO" };
        }

    } catch (e) {
        console.error("Error crítico en verificación:", e);
        return { accesoConcedido: false, mensajeError: "ERROR CRÍTICO DE CONEXIÓN O SISTEMA" };
    }
});

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})