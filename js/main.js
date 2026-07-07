document.addEventListener('DOMContentLoaded', () => {
    // ==========================================
    // CONFIGURACIÓN DE GOOGLE SHEETS
    // ==========================================
    // Pega aquí la URL de la aplicación web de tu Google Apps Script
    const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwjvTam-eQP-1V2lz6sNFFVPxP6dC0ydFONX8YPhx3KtJzfws_ZDsxyumWPUxSsYkO2/exec";

    // ==========================================
    // 1. Header Scrolled State
    // ==========================================
    const header = document.querySelector('header');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });

    // ==========================================
    // 2. Mobile Menu Toggle
    // ==========================================
    const menuToggle = document.querySelector('.menu-toggle');
    const navLinks = document.querySelector('.nav-links');
    
    if (menuToggle && navLinks) {
        menuToggle.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            const icon = menuToggle.querySelector('i');
            if (icon) {
                if (navLinks.classList.contains('active')) {
                    icon.className = 'fas fa-times';
                } else {
                    icon.className = 'fas fa-bars';
                }
            }
        });

        document.querySelectorAll('.nav-links a').forEach(link => {
            link.addEventListener('click', () => {
                navLinks.classList.remove('active');
                const icon = menuToggle.querySelector('i');
                if (icon) icon.className = 'fas fa-bars';
            });
        });
    }

    // ==========================================
    // 3. Back to Top Button
    // ==========================================
    const backToTop = document.querySelector('.back-to-top');
    if (backToTop) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 300) {
                backToTop.classList.add('visible');
            } else {
                backToTop.classList.remove('visible');
            }
        });

        backToTop.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }

    // ==========================================
    // 4. Reservador de Espacios con Google Sheets
    // ==========================================
    const plazaGrid = document.getElementById('plazaGrid');
    if (plazaGrid) {
        const detailCellNum = document.getElementById('detailCellNum');
        const detailCellStatus = document.getElementById('detailCellStatus');
        const detailCellOwner = document.getElementById('detailCellOwner');
        const detailCellPrice = document.getElementById('detailCellPrice');
        const rowOwner = document.getElementById('rowOwner');
        const reserveForm = document.getElementById('reserveForm');
        const statusMsg = document.getElementById('statusMsg');
        const btnSubmitReservation = document.getElementById('btnSubmitReservation');
        
        let activeCell = null;
        const cellMap = {};
        const cells = [];

        // Función para parsear texto de CSV en un Array de objetos
        // Carga inicial de datos desde Google Apps Script JSON
        function fetchPlazaData() {
            // Mostrar mensaje de carga inicial en la cuadrícula
            plazaGrid.innerHTML = '<div style="grid-column: 1/-1; text-align:center; padding: 2rem; color: var(--primary);"><i class="fas fa-circle-notch spinner" style="font-size: 2rem; margin-bottom: 0.5rem;"></i><br>Montando el ruedo, no tenga tanta prisa en comprar ...</div>';
            
            // Añadimos un timestamp para evitar cache del navegador
            const fetchUrl = `${APPS_SCRIPT_URL}?t=${Date.now()}`;
            
            fetch(fetchUrl, {
                method: "GET"
            })
                .then(response => {
                    if (!response.ok) throw new Error("No se pudo conectar al servidor de Google Sheets.");
                    return response.json();
                })
                .then(data => {
                    // Limpiar mapa anterior
                    for (let k in cellMap) delete cellMap[k];
                    
                    data.forEach(row => {
                        const cellNum = parseInt(row["Numero de Celda"], 10);
                        if (cellNum >= 1 && cellNum <= 625) {
                            cellMap[cellNum] = {
                                cellNum: cellNum,
                                nombre: row["Nombre"] || '',
                                apellido: row["Apellido"] || '',
                                estado: row["Estado"] || 'Libre'
                            };
                        }
                    });
                    
                    renderGrid();
                })
                .catch(error => {
                    console.error("Error al cargar la plaza:", error);
                    plazaGrid.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding: 2rem; color: #ff8b8b;"><i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 0.5rem;"></i><br>Error al sincronizar con Google Sheets: ${error.message}</div>`;
                });
        }

        // Renderiza el ruedo 10x10 con los datos reales
        function renderGrid() {
            plazaGrid.innerHTML = '';
            cells.length = 0;
            
            for (let i = 1; i <= 625; i++) {
                const cell = document.createElement('div');
                cell.className = 'grid-cell';
                cell.textContent = i;
                cell.dataset.number = i;
                
                const cellInfo = cellMap[i];
                if (cellInfo) {
                    cell.dataset.status = cellInfo.estado; // "Reservado" o "Asignado"
                    cell.dataset.owner = `${cellInfo.nombre} ${cellInfo.apellido}`.trim();
                    
                    if (cellInfo.estado === 'Reservado') {
                        cell.classList.add('reserved');
                    } else if (cellInfo.estado === 'Asignado') {
                        cell.classList.add('assigned');
                    }
                } else {
                    cell.dataset.status = 'Libre';
                    cell.dataset.owner = 'Nadie - ¡Puede ser tuya!';
                }
                
                cell.dataset.price = '2,50 €';
                
                cell.addEventListener('click', () => {
                    selectCell(cell);
                });
                
                plazaGrid.appendChild(cell);
                cells.push(cell);
            }
            
            // Si había una celda activa previamente, re-seleccionarla para actualizar datos
            if (activeCell) {
                const updatedCell = cells.find(c => c.dataset.number == activeCell.dataset.number);
                if (updatedCell) selectCell(updatedCell);
            }
        }

        // Maneja la selección de una celda
        function selectCell(cell) {
            activeCell = cell;
            
            // Efecto visual de enfoque
            document.querySelectorAll('.grid-cell').forEach(c => c.style.transform = '');
            cell.style.transform = 'scale(1.1)';
            cell.style.zIndex = '10';
            
            // Actualizar textos básicos
            detailCellNum.textContent = `#${cell.dataset.number}`;
            detailCellStatus.textContent = cell.dataset.status;
            detailCellPrice.textContent = cell.dataset.price;
            
            // Ocultar mensajes de estado anteriores
            statusMsg.style.display = 'none';
            
            // Lógica según el estado de la celda
            if (cell.dataset.status === 'Libre') {
                detailCellStatus.style.color = 'var(--primary)';
                rowOwner.style.display = 'none';
                
                // Mostrar formulario y resetear inputs
                reserveForm.style.display = 'flex';
                btnSubmitReservation.disabled = false;
                
            } else {
                // Reservado o Asignado
                rowOwner.style.display = 'flex';
                detailCellOwner.textContent = cell.dataset.owner;
                
                if (cell.dataset.status === 'Reservado') {
                    detailCellStatus.style.color = 'var(--accent)';
                } else {
                    detailCellStatus.style.color = '#ff8b8b';
                }
                
                // Ocultar formulario de reserva (ya está ocupada)
                reserveForm.style.display = 'none';
                
                // Mostrar mensaje informativo de bloqueo
                showStatus("info", "🔒 Esta parcela ya se encuentra reservada o asignada y no puede modificarse.");
            }
        }

        // Muestra los avisos en el panel lateral
        function showStatus(type, msg) {
            statusMsg.style.display = 'flex';
            statusMsg.className = `status-msg ${type}`;
            statusMsg.innerHTML = msg;
        }

        // Procesar el envío de la reserva
        reserveForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            if (!activeCell) return;
            
            const cellNum = activeCell.dataset.number;
            const nombre = document.getElementById('reserveNombre').value.trim();
            const apellido = document.getElementById('reserveApellido').value.trim();
            const telefono = document.getElementById('reserveTelefono').value.trim();
            
            // Validar que se haya configurado el Apps Script
            if (APPS_SCRIPT_URL === "INSERTA_AQUÍ_LA_URL_DE_TU_APPS_SCRIPT" || APPS_SCRIPT_URL.trim() === "") {
                showStatus("error", "⚠️ Configuración pendiente: Debes implementar tu Google Apps Script y pegar la URL en <code>js/main.js</code>.");
                return;
            }
            
            // Deshabilitar botón y mostrar cargando
            btnSubmitReservation.disabled = true;
            showStatus("info", "<i class='fas fa-circle-notch spinner'></i> Conectando con Google Sheets. Por favor, espera...");
            
            // Construimos la petición de reserva como un GET para evitar CORS al usar el protocolo file://
            const params = new URLSearchParams();
            params.append("Numero de Celda", cellNum);
            params.append("Nombre", nombre);
            params.append("Apellido", apellido);
            params.append("Telefono", telefono);
            
            const fetchUrl = `${APPS_SCRIPT_URL}?${params.toString()}`;
            
            fetch(fetchUrl, {
                method: "GET"
            })
            .then(response => {
                if (!response.ok) throw new Error("Respuesta de red incorrecta del servidor.");
                return response.json();
            })
            .then(data => {
                if (data.status === "success") {
                    showStatus("success", `🎉 ${data.message}`);
                    
                    // Actualizar estado de la celda localmente de inmediato
                    activeCell.dataset.status = 'Reservado';
                    activeCell.dataset.owner = `${nombre} ${apellido}`;
                    activeCell.classList.add('reserved');
                    
                    // Re-seleccionar celda para actualizar la vista de detalles
                    selectCell(activeCell);
                    
                    // Resetear formulario
                    reserveForm.reset();
                    
                    // Sincronizar de nuevo con Sheets después de 3 segundos para refrescar
                    setTimeout(fetchPlazaData, 3000);
                } else {
                    showStatus("error", `❌ Error: ${data.message}`);
                    btnSubmitReservation.disabled = false;
                }
            })
            .catch(error => {
                console.error("Error al procesar reserva:", error);
                showStatus("error", `❌ Error de red: No se pudo conectar con Google Sheets (${error.message}). Revisa la URL de implementación de tu Apps Script.`);
                btnSubmitReservation.disabled = false;
            });
        });

        // ==========================================
        // Lógica de Búsqueda y Zoom 9x9
        // ==========================================
        const cellSearchInput = document.getElementById('cellSearchInput');
        const btnSearchCell = document.getElementById('btnSearchCell');
        const btnResetZoom = document.getElementById('btnResetZoom');

        if (btnSearchCell && cellSearchInput && btnResetZoom) {
            
            function performSearch() {
                const targetNum = parseInt(cellSearchInput.value, 10);
                
                if (isNaN(targetNum) || targetNum < 1 || targetNum > 625) {
                    alert("Por favor, ingresa un número de casilla válido (1 a 625).");
                    return;
                }
                
                // Encontrar la celda correspondiente
                const targetCell = cells.find(c => parseInt(c.dataset.number, 10) === targetNum);
                if (!targetCell) return;
                
                // Fila y Columna del objetivo (1-indexed)
                const col = (targetNum - 1) % 25 + 1;
                const row = Math.floor((targetNum - 1) / 25) + 1;
                
                // Detectar si el usuario está en móvil (pantallas menores o iguales a 768px de ancho)
                const isMobile = window.innerWidth <= 768;
                const zoomSize = isMobile ? 5 : 9;
                
                // Definir los límites del viewport (5x5 en móvil, 9x9 en desktop)
                let startRow, endRow;
                if (isMobile) {
                    // Para 5x5, mostramos 2 celdas arriba y 2 abajo (el objetivo queda perfectamente en el centro)
                    startRow = row - 2;
                    endRow = row + 2;
                } else {
                    // Para 9x9, mostramos 4 celdas arriba y 4 abajo
                    startRow = row - 4;
                    endRow = row + 4;
                }
                
                if (startRow < 1) {
                    endRow = endRow + (1 - startRow);
                    startRow = 1;
                }
                if (endRow > 25) {
                    startRow = startRow - (endRow - 25);
                    endRow = 25;
                }
                startRow = Math.max(1, startRow);
                
                let startCol, endCol;
                if (isMobile) {
                    startCol = col - 2;
                    endCol = col + 2;
                } else {
                    startCol = col - 4;
                    endCol = col + 4;
                }
                
                if (startCol < 1) {
                    endCol = endCol + (1 - startCol);
                    startCol = 1;
                }
                if (endCol > 25) {
                    startCol = startCol - (endCol - 25);
                    endCol = 25;
                }
                startCol = Math.max(1, startCol);
                
                // Mostrar solo las celdas en el rango y ocultar el resto
                cells.forEach(cell => {
                    const cellVal = parseInt(cell.dataset.number, 10);
                    const cellCol = (cellVal - 1) % 25 + 1;
                    const cellRow = Math.floor((cellVal - 1) / 25) + 1;
                    
                    if (cellRow >= startRow && cellRow <= endRow && cellCol >= startCol && cellCol <= endCol) {
                        cell.style.display = 'flex';
                    } else {
                        cell.style.display = 'none';
                    }
                    
                    cell.classList.remove('highlighted-search');
                });
                
                // Añadir clase para re-dimensionar fuentes de celdas grandes
                plazaGrid.classList.add('zoomed-view');
                
                // Ajustar estilos de la cuadrícula al modo correspondiente
                plazaGrid.style.gridTemplateColumns = `repeat(${zoomSize}, 1fr)`;
                plazaGrid.style.gridTemplateRows = `repeat(${zoomSize}, 1fr)`;
                
                if (isMobile) {
                    plazaGrid.style.width = '300px';
                    plazaGrid.style.height = '300px';
                    plazaGrid.style.gap = '6px';
                } else {
                    plazaGrid.style.width = '350px';
                    plazaGrid.style.height = '350px';
                    plazaGrid.style.gap = '4px';
                }
                
                // Seleccionar e iluminar la celda buscada
                selectCell(targetCell);
                targetCell.classList.add('highlighted-search');
                
                // Mostrar botón de resetear vista
                btnResetZoom.style.display = 'inline-flex';
                
                // Desplazar el contenedor del ruedo para centrar la visualización
                const wrapper = plazaGrid.parentElement;
                if (wrapper) {
                    wrapper.scrollTo({
                        left: 0,
                        top: 0,
                        behavior: 'smooth'
                    });
                }
            }

            btnSearchCell.addEventListener('click', performSearch);
            
            cellSearchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    performSearch();
                }
            });

            btnResetZoom.addEventListener('click', () => {
                // Restaurar todas las celdas
                cells.forEach(cell => {
                    cell.style.display = 'flex';
                    cell.classList.remove('highlighted-search');
                });
                
                // Restaurar estilos de la cuadrícula
                plazaGrid.classList.remove('zoomed-view');
                plazaGrid.style.gridTemplateColumns = '';
                plazaGrid.style.gridTemplateRows = '';
                plazaGrid.style.width = '';
                plazaGrid.style.height = '';
                plazaGrid.style.gap = '';
                plazaGrid.style.fontSize = '';
                
                // Ocultar botón de resetear vista y vaciar input
                btnResetZoom.style.display = 'none';
                cellSearchInput.value = '';
                
                // Resetear zoom
                currentZoom = 1.0;
                if (zoomLabel) zoomLabel.textContent = '100%';
            });

            // ==========================================
            // Zoom por Botones y Gestos Táctiles (Pinch-to-Zoom)
            // ==========================================
            const btnZoomIn = document.getElementById('btnZoomIn');
            const btnZoomOut = document.getElementById('btnZoomOut');
            const zoomLabel = document.getElementById('zoomLabel');
            
            let currentZoom = 1.0;
            const minZoom = 0.6;
            const maxZoom = 2.4;
            const zoomStep = 0.2;
            
            function getBaseSize() {
                return window.innerWidth <= 480 ? 480 : 550;
            }
            
            function applyZoom() {
                const baseSize = getBaseSize();
                const newSize = baseSize * currentZoom;
                
                // Solo escalamos si no está en modo búsqueda (zoomed-view)
                if (!plazaGrid.classList.contains('zoomed-view')) {
                    plazaGrid.style.width = `${newSize}px`;
                    plazaGrid.style.height = `${newSize}px`;
                    
                    // Escalar proporcionalmente la tipografía
                    const baseFontSize = 0.52; // rem
                    plazaGrid.style.fontSize = `${baseFontSize * currentZoom}rem`;
                }
                
                if (zoomLabel) {
                    zoomLabel.textContent = `${Math.round(currentZoom * 100)}%`;
                }
            }
            
            if (btnZoomIn && btnZoomOut) {
                btnZoomIn.addEventListener('click', () => {
                    if (currentZoom < maxZoom) {
                        currentZoom += zoomStep;
                        applyZoom();
                    }
                });
                
                btnZoomOut.addEventListener('click', () => {
                    if (currentZoom > minZoom) {
                        currentZoom -= zoomStep;
                        applyZoom();
                    }
                });
            }
            
            // Función auxiliar para calcular la distancia entre dos puntos táctiles
            function getDistance(touches) {
                const dx = touches[0].clientX - touches[1].clientX;
                const dy = touches[0].clientY - touches[1].clientY;
                return Math.sqrt(dx * dx + dy * dy);
            }
            
            // Soporte de Gesto Táctil de Pellizco (Pinch-to-Zoom)
            const gridWrapper = plazaGrid.parentElement;
            let touchStartDist = 0;
            let startZoom = 1.0;
            
            if (gridWrapper) {
                gridWrapper.addEventListener('touchstart', (e) => {
                    if (e.touches.length === 2) {
                        touchStartDist = getDistance(e.touches);
                        startZoom = currentZoom;
                    }
                }, { passive: true });
                
                gridWrapper.addEventListener('touchmove', (e) => {
                    if (e.touches.length === 2 && touchStartDist > 0) {
                        const dist = getDistance(e.touches);
                        const factor = dist / touchStartDist;
                        
                        let newZoom = startZoom * factor;
                        newZoom = Math.min(Math.max(newZoom, minZoom), maxZoom);
                        
                        currentZoom = Math.round(newZoom * 100) / 100;
                        applyZoom();
                    }
                }, { passive: true });
                
                gridWrapper.addEventListener('touchend', (e) => {
                    if (e.touches.length < 2) {
                        touchStartDist = 0;
                    }
                });
            }
        }

        // Carga inicial al cargar la página
        fetchPlazaData();
    }

    // ==========================================
    // 5. Gallery Lightbox Modal
    // ==========================================
    const galleryCards = document.querySelectorAll('.gallery-card');
    const lightbox = document.getElementById('lightbox');
    
    if (lightbox && galleryCards.length > 0) {
        const lightboxImg = lightbox.querySelector('img');
        const lightboxCaption = lightbox.querySelector('.lightbox-caption');
        const lightboxClose = lightbox.querySelector('.lightbox-close');

        galleryCards.forEach(card => {
            card.addEventListener('click', () => {
                const img = card.querySelector('img');
                const title = card.querySelector('.gallery-caption').textContent;
                
                if (img) {
                    lightboxImg.src = img.src;
                    lightboxCaption.textContent = title;
                    lightbox.classList.add('active');
                }
            });
        });

        lightboxClose.addEventListener('click', () => {
            lightbox.classList.remove('active');
        });

        lightbox.addEventListener('click', (e) => {
            if (e.target === lightbox) {
                lightbox.classList.remove('active');
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                lightbox.classList.remove('active');
            }
        });
    }
});
