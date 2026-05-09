 let diccionarioActivo = [];
        // Esta función mezcla el diccionario externo con las palabras que guardes localmente
        function cargarArsenal() {
            // Trae las palabras del archivo diccionario.js
            const base = window.diccionarioBase || [];
            // Trae las palabras guardadas en la memoria del navegador (si hay)
            const guardadas = JSON.parse(localStorage.getItem('diccionarioTactico')) || [];
            
            // Une ambas listas y elimina duplicados
            diccionarioActivo = [...new Set([...base, ...guardadas])];
        }

        // Ejecutar al cargar la página
        cargarArsenal();

        // Función para inyectar una nueva palabra y reprocesar al instante
        function inyectarPalabra() {
            const input = document.getElementById('inputNuevaPalabra');
            const estado = document.getElementById('estadoDiccionario');
            const palabra = normalizarTexto(input.value);

            if (palabra && !diccionarioActivo.includes(palabra)) {
                // Recuperar, añadir y guardar en la memoria local
                const guardadas = JSON.parse(localStorage.getItem('diccionarioTactico')) || [];
                guardadas.push(palabra);
                localStorage.setItem('diccionarioTactico', JSON.stringify(guardadas));
                
                cargarArsenal(); // Recargar en memoria
                estado.innerText = `[+] '${palabra}' añadida exitosamente.`;
                input.value = "";
                
                // Reprocesar automáticamente el mensaje actual
                ejecutarAlgoritmo();
            } else if (diccionarioActivo.includes(palabra)) {
                estado.innerText = `[!] La palabra '${palabra}' ya existe en el diccionario.`;
            }
        }

        // Alfabeto y matriz táctica
        const alfabeto = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        const matriz = [
            "MNOPQRSTUVWXYZABCDEFGHIJKL",
            "IJKLMABCDEFGHNOPQRSTYZUVWX",
            "ANOZMYLBPXCKQWDJIVERFSUTHG",
            "HGJILKMONPRQSUTVXWZYABCDEF",
            "FIJHBACDEGKNOLMPQRSTUVWXYZ"
        ];

        // Variables de estado
        let mensajeOriginalCrudo = "";
        let mensajeProcesadoIA = "";
        let mostrandoIA = false;

        // Actualiza el indicador de estado de red al cargar y al cambiar
      /*  function actualizarEstadoRed() {
            const statusText = document.getElementById('statusText');
            if (navigator.onLine) {
                statusText.innerText = "CONECTADO A INTERNET";
                statusText.style.color = "var(--accent-color)";
            } else {
                statusText.innerText = "SIN CONEXIÓN";
                statusText.style.color = "var(--alert-color)";
            }
        }
        window.addEventListener('online', actualizarEstadoRed);
        window.addEventListener('offline', actualizarEstadoRed);
        actualizarEstadoRed(); // Llamada inicial*/

        function normalizarTexto(texto) {
            return texto.normalize("NFD")
                        .replace(/[\u0300-\u036f]/g, "")
                        .replace(/[^A-Za-z]/g, "")
                        .toUpperCase();
        }

        function agruparEnBloques(texto, size) {
            const bloques = texto.match(new RegExp(`.{1,${size}}`, 'g'));
            return bloques ? bloques.join(" ") : "";
        }

       // --- MOTOR IA (Actualizado) ---
        async function procesarConIA(textoCrudo) {
            const outputArea = document.getElementById('outputText');
            const notaIA = document.getElementById('notaIA');
            const btnProcesar = document.getElementById('btnProcesar');
            const panelAprendizaje = document.getElementById('panelAprendizaje');

            btnProcesar.disabled = true;
            btnProcesar.innerText = "ANALIZANDO...";
            outputArea.value = "INTERPRETANDO CON IA LOCAL...";
            
            await new Promise(resolve => setTimeout(resolve, 800)); // Retraso táctico más rápido

            try {
                // USAMOS EL DICCIONARIO ACTIVO (Base + Nuevas)
                const dictSet = new Set(diccionarioActivo);
                let maxLongitud = 0;
                diccionarioActivo.forEach(p => { if(p.length > maxLongitud) maxLongitud = p.length; });

                let textoResultante = "";
                let indice = 0;

                while (indice < textoCrudo.length) {
                    let coincidencia = false;
                    let tamanoEscaneo = Math.min(maxLongitud, textoCrudo.length - indice);

                    for (let len = tamanoEscaneo; len > 0; len--) {
                        let posiblePalabra = textoCrudo.substr(indice, len);
                        if (dictSet.has(posiblePalabra)) {
                            textoResultante += posiblePalabra + " ";
                            indice += len;
                            coincidencia = true;
                            break;
                        }
                    }

                    if (!coincidencia) {
                        textoResultante += textoCrudo[indice] + " ";
                        indice++;
                    }
                }

                textoResultante = textoResultante.replace(/\s+/g, ' ').trim();
                mensajeProcesadoIA = textoResultante.charAt(0).toUpperCase() + textoResultante.slice(1).toLowerCase();
                
                mostrandoIA = true;
                outputArea.value = mensajeProcesadoIA;
                
                notaIA.innerHTML = `⚠️ Mensaje Interpretado con IA (Diccionario Local). 
                                    <a onclick="alternarVista()" id="btnToggleIA">Ver original</a>`;
                notaIA.style.display = "block";
                
                // Mostrar el panel para añadir palabras
                panelAprendizaje.style.display = "block";

            } catch (error) {
                console.error("Error:", error);
                outputArea.value = agruparEnBloques(textoCrudo, 5);
            } finally {
                btnProcesar.disabled = false;
                btnProcesar.innerText = "Procesar";
            }
        }
        // --- PROTOCOLO DE LIMPIEZA AL CAMBIAR MODO ---
        function limpiarInterfaz() {
            // 1. Limpiar campos de texto
            document.getElementById('inputText').value = "";
            document.getElementById('outputText').value = "";
            
            // 2. Ocultar paneles y alertas de IA
            document.getElementById('panelAprendizaje').style.display = "none";
            document.getElementById('notaIA').style.display = "none";
            
            // 3. Reiniciar variables de estado interno
            mensajeOriginalCrudo = "";
            mensajeProcesadoIA = "";
            mostrandoIA = false;
        }

        // Detectar el cambio en los radio buttons ("Cifrar" / "Descifrar")
        document.querySelectorAll('input[name="operation"]').forEach(radio => {
            radio.addEventListener('change', limpiarInterfaz);
        });

        // --- LIMPIEZA AUTOMÁTICA AL ESCRIBIR ---
        document.getElementById('inputText').addEventListener('input', function() {
            // Vaciar solo el área de salida
            document.getElementById('outputText').value = "";
            
            // Ocultar los paneles adicionales
            document.getElementById('panelAprendizaje').style.display = "none";
            document.getElementById('notaIA').style.display = "none";
            
            // Reiniciar las variables de estado de la IA
            mensajeOriginalCrudo = "";
            mensajeProcesadoIA = "";
            mostrandoIA = false;
        });

        async function ejecutarAlgoritmo() {
            const inputText = document.getElementById('inputText').value;
            const operation = document.querySelector('input[name="operation"]:checked').value;
            const textoLimpio = normalizarTexto(inputText);
            const notaIA = document.getElementById('notaIA');
            
            if (!textoLimpio) return; // Evitar procesar vacíos

            let resultadoArray = [];

            // Algoritmo de cifrado/descifrado núcleo
            for (let i = 0; i < textoLimpio.length; i++) {
                const letraActual = textoLimpio[i];
                const filaMatriz = matriz[i % 5];

                if (operation === 'cifrar') {
                    const indice = alfabeto.indexOf(letraActual);
                    resultadoArray.push(filaMatriz[indice]);
                } else {
                    const indice = filaMatriz.indexOf(letraActual);
                    resultadoArray.push(alfabeto[indice]);
                }
            }

            const textoFinal = resultadoArray.join('');
            
            // Lógica de salida basada en operación y conectividad
            if (operation === 'cifrar') {
                // Cifrar siempre muestra bloques y no usa IA
                document.getElementById('outputText').value = agruparEnBloques(textoFinal, 5);
                notaIA.style.display = "none";
            } else {
                // Descifrar usa IA
                mensajeOriginalCrudo = textoFinal; // Guardar el crudo en la variable global
                
                await procesarConIA(mensajeOriginalCrudo);
            }
        }

        function alternarVista() {
            const outputArea = document.getElementById('outputText');
            const link = document.getElementById('btnToggleIA');
            
            if (mostrandoIA) {
                // Cambiar a crudo
                outputArea.value = agruparEnBloques(mensajeOriginalCrudo, 5);
                notaIA.innerHTML= `Mensaje original descifrado. 
                                    <a onclick="alternarVista()" id="btnToggleIA">Mostrar interpretación inteligente</a>`;
            } else {
                // Cambiar a IA
                outputArea.value = mensajeProcesadoIA;
                notaIA.innerHTML= `⚠️ Mensaje Interpretado con IA (Diccionario Local). 
                                    <a onclick="alternarVista()" id="btnToggleIA">Ver original</a>`;
            }
            mostrandoIA = !mostrandoIA;
        }

async function copiarMensaje() {
    // 1. Obtenemos el texto exacto que queremos copiar
    const texto = document.getElementById('outputText').value;
    const boton = document.getElementById('btnCopiar');

    if (!texto || texto.trim() === "") {
        console.warn("El cuadro de texto está vacío, no hay nada que copiar.");
        return; 
    }

    try {
        // 2. Usamos la API nativa para escribir en el portapapeles
        await navigator.clipboard.writeText(texto);
        
        // 3. Feedback visual: Cambiamos el texto del botón por 2 segundos
        const textoOriginal = boton.innerText;
        boton.innerText = "✅ ¡Copiado!";
        boton.style.color = "white";
        boton.style.fontSize= "0.8rem";

        // Devolvemos el botón a la normalidad después de 2 segundos
        setTimeout(() => {
            boton.innerText = textoOriginal;
            boton.style.backgroundColor = ""; // Restaura el color original
            boton.style.color = "";
            boton.style.fontSize= "1.2rem";
        }, 2000);

    } catch (err) {
        console.error('Error al intentar copiar al portapapeles:', err);
        alert("No se pudo copiar el texto. Seleccionalo manualmente.");
    }
}

async function pegarMensaje() {
    const textareaEntrada = document.getElementById('inputText');
    const boton = document.getElementById('btnPegar');

    try {
        // 1. Leemos el texto que esté copiado en la PC
        const textoPegado = await navigator.clipboard.readText();
        
        // 2. Insertamos el texto en el textarea
        textareaEntrada.value = textoPegado;
        
        // 3. Feedback visual reusando la clase de texto pequeño
        const iconoOriginal = boton.innerText;
        boton.innerText = "Texto Pegado";
        boton.style.color = "white";
        boton.classList.add('btn-texto-copiado');
        boton.style.fontSize="0.8rem";

        setTimeout(() => {
            boton.innerText = iconoOriginal;
            boton.classList.remove('btn-texto-copiado');
            boton.style.color = "";
            boton.style.fontSize="1.2rem";
        }, 2000);

    } catch (err) {
        console.error('Error al intentar pegar desde el portapapeles:', err);
        // Si sale este error, suele ser porque el usuario no ha dado permisos
        // o el portapapeles está vacío/tiene una imagen.
    }
}