import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons'; // Iconos estándar

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#000', // Negro cuando está activo
        tabBarInactiveTintColor: '#999', // Gris cuando no
        headerStyle: {
          backgroundColor: '#000', // Cabecera negra estilo "Pro"
        },
        headerTintColor: '#fff', // Texto blanco
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      {/* Pestaña 1: Home / Dashboard */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Panel',
          tabBarLabel: 'Inicio',
          tabBarIcon: ({ color }) => <Ionicons name="grid-outline" size={24} color={color} />,
        }}
      />

      {/* Pestaña 2: El Cotizador (Donde está tu lista de precios) */}
      <Tabs.Screen
        name="cotizador"
        options={{
          title: 'Nuevo Presupuesto',
          tabBarLabel: 'Cotizar',
          tabBarIcon: ({ color }) => <Ionicons name="calculator-outline" size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}