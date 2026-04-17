'use client'

import { useState } from 'react'
import { User, Bell, Shield, Users, CreditCard, Key } from 'lucide-react'

type SettingsSection = 'profile' | 'notifications' | 'team' | 'security' | 'billing'

const sections = [
  { id: 'profile' as const, label: 'Perfil', icon: User },
  { id: 'notifications' as const, label: 'Notificaciones', icon: Bell },
  { id: 'team' as const, label: 'Equipo', icon: Users },
  { id: 'security' as const, label: 'Seguridad', icon: Shield },
  { id: 'billing' as const, label: 'Facturación', icon: CreditCard },
]

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState<SettingsSection>('profile')
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
        <p className="text-gray-500">Administra la configuración de tu cuenta y workspace</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <div className="lg:w-64 flex-shrink-0">
          <div className="bg-white rounded-lg shadow p-2">
            <nav className="space-y-1">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    activeSection === section.id
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <section.icon className="h-5 w-5" />
                  {section.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {activeSection === 'profile' && <ProfileSection onSave={handleSave} saved={saved} />}
          {activeSection === 'notifications' && <NotificationsSection onSave={handleSave} saved={saved} />}
          {activeSection === 'team' && <TeamSection />}
          {activeSection === 'security' && <SecuritySection onSave={handleSave} saved={saved} />}
          {activeSection === 'billing' && <BillingSection />}
        </div>
      </div>
    </div>
  )
}

function ProfileSection({ onSave, saved }: { onSave: () => void; saved: boolean }) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Perfil</h2>
      <p className="text-sm text-gray-500 mb-6">Actualiza tu información personal.</p>

      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-gray-200 flex items-center justify-center">
            <span className="text-xl font-medium text-gray-600">J</span>
          </div>
          <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
            Cambiar foto
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
            <input
              type="text"
              defaultValue="Usuario"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              defaultValue="usuario@ejemplo.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
          <input
            type="text"
            defaultValue="Administrador"
            disabled
            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
          />
        </div>

        <div className="flex items-center gap-3 pt-4 border-t">
          <button
            onClick={onSave}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {saved ? '✓ Guardado' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  )
}

function NotificationsSection({ onSave, saved }: { onSave: () => void; saved: boolean }) {
  const [preferences, setPreferences] = useState({
    email_leads: true,
    email_deals: true,
    email_tasks: true,
    browser_notifications: false,
  })

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Notificaciones</h2>
      <p className="text-sm text-gray-500 mb-6">Configura cómo quieres recibir notificaciones.</p>

      <div className="space-y-4">
        {[
          { key: 'email_leads', label: 'Nuevos leads', description: 'Recibir email cuando llegue un nuevo lead' },
          { key: 'email_deals', label: 'Actualizaciones de deals', description: 'Recibir email cuando un deal cambie de etapa' },
          { key: 'email_tasks', label: 'Recordatorios de tareas', description: 'Recibir email para tareas próximas' },
          { key: 'browser_notifications', label: 'Notificaciones del navegador', description: 'Mostrar notificaciones en el navegador' },
        ].map((item) => (
          <div key={item.key} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
            <div>
              <p className="text-sm font-medium text-gray-900">{item.label}</p>
              <p className="text-sm text-gray-500">{item.description}</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={preferences[item.key as keyof typeof preferences]}
                onChange={(e) => setPreferences({ ...preferences, [item.key]: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
            </label>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 pt-6 border-t mt-6">
        <button
          onClick={onSave}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          {saved ? '✓ Guardado' : 'Guardar cambios'}
        </button>
      </div>
    </div>
  )
}

function TeamSection() {
  const [members] = useState([
    { id: '1', name: 'Usuario Admin', email: 'admin@ejemplo.com', role: 'admin' },
    { id: '2', name: 'Setter', email: 'setter@ejemplo.com', role: 'setter' },
  ])

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Equipo</h2>
          <p className="text-sm text-gray-500">Gestiona los miembros de tu workspace.</p>
        </div>
        <button className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors">
          Invitar miembro
        </button>
      </div>

      <div className="space-y-3">
        {members.map((member) => (
          <div key={member.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                <span className="text-sm font-medium text-gray-600">{member.name.charAt(0)}</span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{member.name}</p>
                <p className="text-sm text-gray-500">{member.email}</p>
              </div>
            </div>
            <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded capitalize">
              {member.role}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function SecuritySection({ onSave, saved }: { onSave: () => void; saved: boolean }) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Seguridad</h2>
      <p className="text-sm text-gray-500 mb-6">Gestiona la seguridad de tu cuenta.</p>

      <div className="space-y-6">
        <div className="pb-6 border-b border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <Key className="h-5 w-5 text-gray-500" />
            <h3 className="text-sm font-medium text-gray-900">Cambiar contraseña</h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña actual</label>
              <input
                type="password"
                placeholder="••••••••"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nueva contraseña</label>
              <input
                type="password"
                placeholder="••••••••"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar contraseña</label>
              <input
                type="password"
                placeholder="••••••••"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <button
              onClick={onSave}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {saved ? '✓ Guardado' : 'Actualizar contraseña'}
            </button>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-2">Sesiones activas</h3>
          <p className="text-sm text-gray-500 mb-3">Dispositivos donde tu cuenta está conectada.</p>
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-700">Este dispositivo — Activo ahora</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function BillingSection() {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Facturación</h2>
      <p className="text-sm text-gray-500 mb-6">Gestiona tu plan y facturación.</p>

      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-6">
        <p className="text-sm font-medium text-blue-900">Plan actual: Pro</p>
        <p className="text-sm text-blue-700">Tienes acceso a todas las funcionalidades premium.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {[
          { name: 'Free', price: '$0', features: ['3 usuarios', '100 leads', 'Basic support'] },
          { name: 'Pro', price: '$29', features: ['10 usuarios', 'Leads ilimitados', 'Priority support'], current: true },
          { name: 'Enterprise', price: '$99', features: ['Usuarios ilimitados', 'Leads ilimitados', 'Dedicated support'] },
        ].map((plan) => (
          <div
            key={plan.name}
            className={`p-4 border rounded-lg ${
              plan.current ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
            }`}
          >
            <p className="text-sm font-medium text-gray-900">{plan.name}</p>
            <p className="text-2xl font-bold text-gray-900">{plan.price}<span className="text-sm font-normal text-gray-500">/mes</span></p>
            <ul className="mt-3 space-y-1">
              {plan.features.map((f) => (
                <li key={f} className="text-sm text-gray-600">• {f}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <button className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors">
        Gestionar suscripción
      </button>
    </div>
  )
}
