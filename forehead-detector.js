/**
 * Stirnraten-Detektor
 * Erkennt, wenn das Smartphone im Querformat gehalten wird und der Bildschirm
 * vom Gesicht weg nach vorne zeigt (wie beim Stirnraten-Spiel)
 */

class ForeheadDetector {
    constructor(options = {}) {
      // Standardwerte
      this.options = {
        onForeheadPosition: () => console.log("Smartphone ist in Stirnposition!"),
        onNormalPosition: () => console.log("Smartphone ist zurück in normaler Position"),
        // Schwellenwerte für die Erkennung (können angepasst werden)
        alphaThreshold: 30,  // Grad (Toleranz für Drehung um die vertikale Achse)
        betaThreshold: 20,   // Grad (nahezu horizontal)
        gammaThreshold: 70,  // Grad (für Querformat, nahe 90° oder -90°)
        stabilityTime: 500,  // ms, wie lange die Position gehalten werden muss
        ...options
      };
      
      this.isInForeheadPosition = false;
      this.positionTimer = null;
      this.hasPermission = false;
      
      // Methoden an die Klasse binden
      this.handleOrientation = this.handleOrientation.bind(this);
      this.start = this.start.bind(this);
      this.stop = this.stop.bind(this);
    }
  
    /**
     * Verarbeitet die Orientierungsdaten des Geräts
     */
    handleOrientation(event) {
      // Alpha: Drehung um die Z-Achse (0-360°)
      // Beta: Vorder-/Rückneigung (0° ist flach, 90° ist senkrecht nach oben)
      // Gamma: Seitliche Neigung (-90° bis 90°)
      const { alpha, beta, gamma } = event;
      
      // Prüfen, ob das Gerät in der Stirnposition ist:
      // - Beta nahe 0° (Gerät fast horizontal gehalten)
      // - Gamma nahe +/-90° (Gerät im Querformat) 
      // - Alpha-Winkel prüfen, um sicherzustellen, dass das Gerät nach vorne zeigt
      
      // Prüfen ob im Querformat (gamma nahe +90° oder -90°)
      const isLandscape = gamma !== null && (Math.abs(gamma) > this.options.gammaThreshold);
      
      // Prüfen ob nahezu horizontal gehalten (beta nahe 0°)
      const isAlmostHorizontal = beta !== null && Math.abs(beta) < this.options.betaThreshold;
      
      // Alpha-Wert für die Ausrichtung nach vorne (kann je nach Gerät variieren)
      // Da Alpha-Werte sehr gerätespezifisch sein können, verwenden wir hier eine weite Toleranz
      const isPointingForward = alpha !== null;
      
      const isForeheadPositionNow = isLandscape && isAlmostHorizontal && isPointingForward;
      
      // Statuswechsel mit Verzögerung für Stabilität
      if (isForeheadPositionNow !== this.isInForeheadPosition) {
        // Timer zurücksetzen, wenn sich die Position ändert
        clearTimeout(this.positionTimer);
        
        this.positionTimer = setTimeout(() => {
          // Status aktualisieren und Callback aufrufen
          this.isInForeheadPosition = isForeheadPositionNow;
          
          if (isForeheadPositionNow) {
            this.options.onForeheadPosition();
          } else {
            this.options.onNormalPosition();
          }
        }, this.options.stabilityTime);
      }
    }
  
    /**
     * Startet die Erkennung
     */
    async start() {
      // Prüfen, ob der Browser Device Orientation unterstützt
      if (!window.DeviceOrientationEvent) {
        console.error("Dein Browser unterstützt keine Geräteorientierung");
        return false;
      }
      
      // Bei iOS 13+ Berechtigungen einholen
      if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        try {
          const permissionState = await DeviceOrientationEvent.requestPermission();
          this.hasPermission = (permissionState === 'granted');
          
          if (!this.hasPermission) {
            console.error("Berechtigungen für Geräteorientierung abgelehnt");
            return false;
          }
        } catch (error) {
          console.error("Fehler beim Anfordern der Berechtigung:", error);
          return false;
        }
      }
      
      // Event-Listener hinzufügen
      window.addEventListener('deviceorientation', this.handleOrientation);
      console.log("Stirnraten-Detektor gestartet");
      return true;
    }
  
    /**
     * Stoppt die Erkennung
     */
    stop() {
      window.removeEventListener('deviceorientation', this.handleOrientation);
      clearTimeout(this.positionTimer);
      console.log("Stirnraten-Detektor gestoppt");
    }
    
    /**
     * Debug-Funktion, um aktuelle Orientierungswerte anzuzeigen
     * Hilft bei der Kalibrierung der Schwellenwerte
     */
    static startDebug() {
      const debugDiv = document.createElement('div');
      debugDiv.id = 'orientation-debug';
      debugDiv.style.position = 'fixed';
      debugDiv.style.bottom = '10px';
      debugDiv.style.left = '10px';
      debugDiv.style.backgroundColor = 'rgba(0,0,0,0.7)';
      debugDiv.style.color = 'white';
      debugDiv.style.padding = '10px';
      debugDiv.style.fontFamily = 'monospace';
      debugDiv.style.zIndex = '9999';
      document.body.appendChild(debugDiv);
      
      window.addEventListener('deviceorientation', (event) => {
        const { alpha, beta, gamma } = event;
        debugDiv.innerHTML = `
          Alpha: ${alpha ? alpha.toFixed(1) : 'N/A'}° <br>
          Beta: ${beta ? beta.toFixed(1) : 'N/A'}° <br>
          Gamma: ${gamma ? gamma.toFixed(1) : 'N/A'}°
        `;
      });
      
      console.log("Orientierungs-Debug gestartet");
    }
  }
  
  // Beispiel für die Verwendung:
  document.addEventListener('DOMContentLoaded', () => {
    const detector = new ForeheadDetector({
      onForeheadPosition: () => {
        console.log("Stirnposition erkannt! Das Wort sollte jetzt angezeigt werden.");
        // Hier könnte die Aktion für das Stirnraten ausgelöst werden
        document.getElementById('wordDisplay').style.display = 'block';
      },
      onNormalPosition: () => {
        console.log("Zurück in normaler Position.");
        document.getElementById('wordDisplay').style.display = 'none';
      }
    });
    
    // Button zum Starten/Stoppen des Detektors
    const toggleButton = document.getElementById('toggleDetector');
    let isActive = false;
    
    if (toggleButton) {
      toggleButton.addEventListener('click', async () => {
        if (!isActive) {
          const started = await detector.start();
          if (started) {
            isActive = true;
            toggleButton.textContent = 'Detektor stoppen';
          }
        } else {
          detector.stop();
          isActive = false;
          toggleButton.textContent = 'Detektor starten';
        }
      });
    }
    
    // Debug-Button hinzufügen
    const debugButton = document.getElementById('debugOrientation');
    if (debugButton) {
      debugButton.addEventListener('click', () => {
        ForeheadDetector.startDebug();
        debugButton.disabled = true;
      });
    }
  });
  