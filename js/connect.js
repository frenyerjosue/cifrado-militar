const { ipcRenderer } = require('electron');
        const { machineIdSync } = require('node-machine-id');
        const { supabase } = require('./js/database.js');

        const authOverlay = document.getElementById('authOverlay');
        const blockedOverlay = document.getElementById('blockedOverlay');
        const inputLicencia = document.getElementById('inputLicencia');
        const btnVerificar = document.getElementById('btnVerificar');
        const txtFeedback = document.getElementById('txtFeedback');
        
        // VERIFICACIÓN INMEDIATA (MODO OFFLINE / AUTO-LOGIN)
        try {
            const hardwareActual = machineIdSync(); 
            const hardwareAutorizado = localStorage.getItem('hwid_aprobado');
            const estadoLicencia = localStorage.getItem('estado_licencia');

            if (estadoLicencia === 'bloqueado') {
                authOverlay.style.display = "none";
                blockedOverlay.style.display = "flex"; // Mostramos el mensaje de bloqueo
                
                // Seguimos verificando en la nube por si lo perdonaste (reactivaste) en la BBDD
                verificarlicencia(hardwareActual); 
            } else if (hardwareActual === hardwareAutorizado && hardwareAutorizado !== null) {
                // Si coinciden, ocultamos la pantalla negra instantáneamente
                authOverlay.style.display = "none";
                blockedOverlay.style.display = "none";
                verificarlicencia(hardwareActual);
            } else{
                authOverlay.style.display = "flex"; 
                blockedOverlay.style.display = "none";
            }
        } catch (e) {
            console.error("Fallo al leer hardware local", e);
        }

        // FUNCIÓN DEL BOTÓN VERIFICAR (CONEXIÓN A SUPABASE)
        function mostrarEstado(mensaje, color) {
            txtFeedback.innerText = mensaje;
            txtFeedback.style.color = color;
        }

        btnVerificar.addEventListener('click', () => {
            const licenciaIngresada = inputLicencia.value.trim().toUpperCase();

            if (!licenciaIngresada) {
                mostrarEstado("[!] INGRESE UNA CLAVE VÁLIDA", "#ff4d4d");
                return;
            }

            btnVerificar.disabled = true;
            btnVerificar.innerText = "VERIFICANDO EN EL SERVIDOR...";
            mostrarEstado("[*] Solicitando conexión con el servidor...", "#d1b038");

            // Enviar la clave al main.js
            ipcRenderer.invoke('iniciar-verificacion', licenciaIngresada).then((respuesta) => {
                if (respuesta.accesoConcedido) {
                    mostrarEstado("[+] ACCESO CONCEDIDO.", "#6b8e23");
                    
                    // GUARDAMOS EL HWID PARA FUTUROS INICIOS SIN INTERNET
                    localStorage.setItem('hwid_aprobado', respuesta.hwidAprobado);
                    
                    setTimeout(() => {
                        authOverlay.style.display = "none";
                    }, 1200);
                } else {
                    mostrarEstado("[!] " + respuesta.mensajeError, "#ff4d4d");
                    btnVerificar.disabled = false;
                    btnVerificar.innerText = "INGRESAR";
                }
            }).catch((err) => {
                mostrarEstado("[!] FALLO DE CONEXIÓN CON EL SERVIDOR", "#ff4d4d");
                btnVerificar.disabled = false;
                btnVerificar.innerText = "REINTENTAR";
            });
        });

        // Activar botón con tecla Enter
        inputLicencia.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') btnVerificar.click();
        });

async function verificarlicencia(miHWID) {
    try {
        const { data, error } = await supabase
            .from('LICENCIAS')
            .select('estado')
            .eq('hwid_vinculado', miHWID)
            .maybeSingle();

        if (error) throw error;

        if (!data) {
            console.warn("Este HWID no existe en la BBDD. Bloqueando acceso...");
            localStorage.removeItem('hwid_aprobado');
            localStorage.removeItem('estado_licencia');
            
            document.getElementById('authOverlay').style.display = "flex";
            document.getElementById('blockedOverlay').style.display = "none";
            return;
        }

        // Si la base de datos dice que la licencia fue desactivada (false)
        if (data) {
            // Si la base de datos dice que la licencia fue desactivada (false)
            if (data.estado === false) {
                console.warn("Licencia bloqueada.");
                
                // 1. Actualizamos la bandera local a bloqueado
                localStorage.setItem('estado_licencia', 'bloqueado');
                
                // 2. Ocultamos la app y mostramos la pantalla de bloqueo
                authOverlay.style.display = "none"; 
                blockedOverlay.style.display = "flex"; 

                const appContent = document.getElementById('app-content');
                if (appContent) {
                    appContent.innerHTML = ""; // Vaciamos todo su contenido
                    appContent.remove();       // Y luego eliminamos el contenedor
                }
            }
            // Si la licencia es true (puede que lo hayas reactivado)
            else if (data.estado === true) {
                // Restauramos la bandera a autorizado
                localStorage.setItem('estado_licencia', 'autorizado');
                
                // Si casualmente estaba viendo la pantalla de bloqueo, se la quitamos
                blockedOverlay.style.display = "none";
            }
        }
    } catch (error) {
        console.error("Error al verificar el estado en Supabase:", error.message);
    }
}