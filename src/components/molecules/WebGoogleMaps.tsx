import React, { useEffect, useRef } from 'react';
import { View } from 'react-native';

// 👇 ESTO SOLUCIONA EL ERROR DE TYPESCRIPT "La propiedad google no existe"
declare global {
  interface Window {
    google: any;
  }
}

interface Props {
  apiKey: string;
  initialValue?: string;
  onPlaceSelected: (details: { address: string; lat: number; lng: number }) => void;
}

export const WebGoogleMaps = ({ apiKey, initialValue, onPlaceSelected }: Props) => {
  const inputContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadGoogleMaps = async () => {
      // 1. Inyectar script si no existe
      if (!document.querySelector('#google-maps-script')) {
        const script = document.createElement('script');
        script.id = 'google-maps-script';
        // "libraries=places" y "v=weekly" son vitales para la Nueva API
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async&v=weekly`;
        script.async = true;
        document.head.appendChild(script);
      }

      // 2. Esperar a que la API cargue (Polling)
      const interval = setInterval(async () => {
        if (window.google && window.google.maps && window.google.maps.importLibrary) {
          clearInterval(interval);
          
          try {
            // Importar la librería de Places (Nueva versión)
            const { PlaceAutocompleteElement } = await window.google.maps.importLibrary("places");
            
            if (inputContainerRef.current) {
                inputContainerRef.current.innerHTML = ''; // Limpiar previo
                
                // Instanciar el Web Component oficial
                const autocompleteComponent = new PlaceAutocompleteElement();
                
                // Configurar props del componente nativo de Google
                (autocompleteComponent as any).placeholder = "Escribe la dirección de la obra...";
                
                // Estilos CSS directos al Web Component
                Object.assign(autocompleteComponent.style, {
                    width: '100%',
                    height: '50px',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    padding: '0 12px',
                    fontSize: '16px',
                    backgroundColor: '#F3F4F6',
                    outline: 'none',
                    marginTop: '5px'
                });

                // Escuchar evento de selección
                autocompleteComponent.addEventListener('gmp-places-select', async ({ place }: any) => {
                    await place.fetchFields({ fields: ['displayName', 'formattedAddress', 'location'] });
                    
                    onPlaceSelected({
                        address: place.formattedAddress,
                        lat: place.location.lat(),
                        lng: place.location.lng()
                    });
                });

                inputContainerRef.current.appendChild(autocompleteComponent);
            }
          } catch (e) {
            console.error("Error inicializando Places New API:", e);
          }
        }
      }, 100);
    };

    loadGoogleMaps();
  }, [apiKey]);

  return (
    // Usamos div nativo de web envuelto en View compatible
    <div ref={inputContainerRef} style={{ width: '100%' }} />
  );
};