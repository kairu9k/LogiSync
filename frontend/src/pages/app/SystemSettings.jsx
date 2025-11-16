import { useState, useEffect } from 'react'
import { apiGet, apiPost } from '../../lib/api'

export default function SystemSettings() {
  const [pricingConfig, setPricingConfig] = useState(null)
  const [pricingLoading, setPricingLoading] = useState(true)
  const [pricingSaving, setPricingSaving] = useState(false)
  const [preview, setPreview] = useState(null)
  const [previewInputs, setPreviewInputs] = useState({
    distance: 50,
    weight: 25,
    service_type: 'standard'
  })

  useEffect(() => {
    loadPricingConfig()
  }, [])

  const loadPricingConfig = async () => {
    try {
      const response = await apiGet('/api/pricing/config')
      setPricingConfig(response.data)
    } catch (error) {
      console.error('Failed to load pricing config:', error)
    } finally {
      setPricingLoading(false)
    }
  }

  const handlePricingChange = (field, value) => {
    setPricingConfig(prev => ({
      ...prev,
      [field]: parseFloat(value) || 0
    }))
  }

  const savePricingConfig = async () => {
    setPricingSaving(true)
    try {
      await apiPost('/api/pricing/config', pricingConfig)
      alert('Pricing formula saved successfully!')
    } catch (error) {
      alert('Failed to save pricing formula: ' + (error.message || 'Unknown error'))
    } finally {
      setPricingSaving(false)
    }
  }

  const calculatePreview = async () => {
    try {
      const response = await apiPost('/api/pricing/preview', previewInputs)
      setPreview(response.data)
    } catch (error) {
      console.error('Failed to calculate preview:', error)
    }
  }

  useEffect(() => {
    if (pricingConfig && previewInputs.distance > 0 && previewInputs.weight > 0) {
      calculatePreview()
    }
  }, [pricingConfig, previewInputs])

  return (
    <div className="grid" style={{ gap: 24 }}>
      {/* Header with Gradient */}
      <div style={{
        background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
        borderRadius: '16px',
        padding: '32px',
        boxShadow: '0 10px 30px rgba(59, 130, 246, 0.3)'
      }}>
        <h1 style={{
          margin: 0,
          color: 'white',
          fontSize: '28px',
          fontWeight: '700',
          marginBottom: '8px'
        }}>⚙️ System Settings</h1>
        <p style={{
          margin: 0,
          color: 'rgba(255,255,255,0.9)',
          fontSize: '15px'
        }}>Configure system preferences and pricing formula</p>
      </div>

      {/* Pricing Formula Section */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(10px)',
        borderRadius: '16px',
        padding: '28px',
        border: '2px solid rgba(255, 255, 255, 0.1)'
      }}>
        <h2 style={{
          margin: '0 0 8px 0',
          fontSize: '20px',
          fontWeight: '700',
          color: 'white'
        }}>💰 Pricing Formula</h2>
        <p style={{
          margin: '0 0 24px 0',
          fontSize: '14px',
          color: 'rgba(255, 255, 255, 0.7)'
        }}>Customize how shipping costs are calculated for all quotes</p>

        {pricingLoading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--gray-500)' }}>
            Loading pricing configuration...
          </div>
        ) : pricingConfig ? (
          <>
            <div className="grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px', marginBottom: 24 }}>
              <label>
                <div style={{
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#3b82f6',
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>Base Rate (₱)</div>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={pricingConfig.base_rate}
                  onChange={(e) => handlePricingChange('base_rate', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    fontSize: '14px',
                    borderRadius: '10px',
                    border: '2px solid var(--border)',
                    transition: 'all 0.3s ease'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'var(--primary-500)'
                    e.target.style.boxShadow = '0 0 0 3px var(--primary-100)'
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'var(--border)'
                    e.target.style.boxShadow = 'none'
                  }}
                />
                <div style={{
                  fontSize: '12px',
                  color: 'var(--text-muted)',
                  marginTop: '6px'
                }}>Fixed starting price for all shipments</div>
              </label>

              {[
                { key: 'per_km_rate', label: 'Per Kilometer (₱)', helper: 'Cost per kilometer of distance', min: 0, step: '0.01' },
                { key: 'per_kg_rate', label: 'Per Kilogram (₱)', helper: 'Cost per kilogram of weight', min: 0, step: '0.01' },
                { key: 'fuel_surcharge_percent', label: 'Fuel Surcharge (%)', helper: 'Percentage added for fuel costs', min: 0, max: 100, step: '0.01' },
                { key: 'insurance_percent', label: 'Insurance (%)', helper: 'Percentage for insurance coverage', min: 0, max: 100, step: '0.01' },
                { key: 'minimum_charge', label: 'Minimum Charge (₱)', helper: 'Minimum amount to charge regardless of calculation', min: 0, step: '0.01' },
                { key: 'priority_multiplier', label: 'Standard Multiplier (x)', helper: 'Multiplier for standard destinations', min: 1, step: '0.01' },
                { key: 'express_multiplier', label: 'Remote Multiplier (x)', helper: 'Multiplier for remote areas (provinces, islands)', min: 1, step: '0.01' }
              ].map(field => (
                <label key={field.key}>
                  <div style={{
                    fontSize: '12px',
                    fontWeight: '600',
                    color: '#3b82f6',
                    marginBottom: '8px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>{field.label}</div>
                  <input
                    type="number"
                    step={field.step}
                    min={field.min}
                    max={field.max}
                    value={pricingConfig[field.key]}
                    onChange={(e) => handlePricingChange(field.key, e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      fontSize: '14px',
                      borderRadius: '10px',
                      border: '2px solid var(--border)',
                      transition: 'all 0.3s ease'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = 'var(--primary-500)'
                      e.target.style.boxShadow = '0 0 0 3px var(--primary-100)'
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'var(--border)'
                      e.target.style.boxShadow = 'none'
                    }}
                  />
                  <div style={{
                    fontSize: '12px',
                    color: 'var(--text-muted)',
                    marginTop: '6px'
                  }}>{field.helper}</div>
                </label>
              ))}
            </div>

            {/* Preview Calculator */}
            <div style={{
              background: 'var(--surface-50)',
              border: '2px solid var(--border)',
              borderRadius: '12px',
              padding: '24px',
              marginBottom: 24
            }}>
              <h3 style={{
                marginTop: 0,
                marginBottom: 20,
                fontSize: '18px',
                fontWeight: '700'
              }}>📊 Preview Calculation</h3>

              <div className="grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: 16 }}>
                <label>
                  <div className="label">Distance (km)</div>
                  <input
                    type="number"
                    className="input"
                    min="0"
                    value={previewInputs.distance}
                    onChange={(e) => setPreviewInputs(prev => ({ ...prev, distance: parseFloat(e.target.value) || 0 }))}
                  />
                </label>

                <label>
                  <div className="label">Weight (kg)</div>
                  <input
                    type="number"
                    className="input"
                    min="0"
                    value={previewInputs.weight}
                    onChange={(e) => setPreviewInputs(prev => ({ ...prev, weight: parseFloat(e.target.value) || 0 }))}
                  />
                </label>

                <label>
                  <div className="label">Service Type</div>
                  <select
                    className="input"
                    value={previewInputs.service_type}
                    onChange={(e) => setPreviewInputs(prev => ({ ...prev, service_type: e.target.value }))}
                  >
                    <option value="standard">Standard</option>
                    <option value="priority">Priority</option>
                    <option value="express">Express</option>
                  </select>
                </label>
              </div>

              {preview && (
                <div style={{
                  background: 'var(--gray-100)',
                  border: '2px solid var(--primary-300)',
                  borderRadius: '8px',
                  padding: '16px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span className="muted">Base Rate:</span>
                    <span style={{ fontWeight: 500 }}>₱ {preview.breakdown.base_rate.toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span className="muted">Distance Cost:</span>
                    <span style={{ fontWeight: 500 }}>₱ {preview.breakdown.distance_cost.toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span className="muted">Weight Cost:</span>
                    <span style={{ fontWeight: 500 }}>₱ {preview.breakdown.weight_cost.toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span className="muted">Fuel Surcharge:</span>
                    <span style={{ fontWeight: 500 }}>₱ {preview.breakdown.fuel_surcharge.toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span className="muted">Insurance:</span>
                    <span style={{ fontWeight: 500 }}>₱ {preview.breakdown.insurance.toFixed(2)}</span>
                  </div>
                  {preview.breakdown.service_multiplier !== 1 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span className="muted">Service Multiplier ({preview.service_type}):</span>
                      <span style={{ fontWeight: 500 }}>{preview.breakdown.service_multiplier}x</span>
                    </div>
                  )}
                  <div style={{
                    borderTop: '2px solid var(--primary-200)',
                    marginTop: 12,
                    paddingTop: 12,
                    display: 'flex',
                    justifyContent: 'space-between'
                  }}>
                    <span style={{ fontWeight: 700, fontSize: '18px' }}>Total:</span>
                    <span style={{ fontWeight: 700, fontSize: '18px', color: 'var(--primary-600)' }}>
                      ₱ {preview.breakdown.final_total.toFixed(2)}
                    </span>
                  </div>
                  {preview.breakdown.final_total === preview.breakdown.minimum_charge && (
                    <div style={{
                      marginTop: 8,
                      fontSize: '12px',
                      color: 'var(--warning-600)',
                      textAlign: 'center'
                    }}>
                      * Minimum charge applied
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              className="btn btn-primary"
              onClick={savePricingConfig}
              disabled={pricingSaving}
              style={{
                padding: '12px 28px',
                fontSize: '15px',
                fontWeight: '600',
                borderRadius: '10px',
                transition: 'all 0.3s ease'
              }}
              onMouseOver={(e) => {
                if (!pricingSaving) {
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.15)'
                }
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              {pricingSaving ? '⏳ Saving...' : '💾 Save Pricing Formula'}
            </button>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--danger-600)' }}>
            Failed to load pricing configuration
          </div>
        )}
      </div>

      <div style={{
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(10px)',
        borderRadius: '16px',
        padding: '28px',
        border: '2px solid rgba(255, 255, 255, 0.1)'
      }}>
        <h3 style={{
          margin: '0 0 20px 0',
          fontSize: '20px',
          fontWeight: '700',
          color: 'white'
        }}>🔧 General Settings</h3>
        <div style={{ marginBottom: 20 }}>
          <label style={{
            display: 'block',
            fontSize: '12px',
            fontWeight: '600',
            color: '#3b82f6',
            marginBottom: '8px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>Company Name</label>
          <input
            type="text"
            placeholder="Your company name"
            defaultValue="LogiSync Inc."
            style={{
              width: '100%',
              padding: '10px 14px',
              fontSize: '14px',
              borderRadius: '10px',
              border: '2px solid var(--border)',
              transition: 'all 0.3s ease'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = 'var(--primary-500)'
              e.target.style.boxShadow = '0 0 0 3px var(--primary-100)'
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'var(--border)'
              e.target.style.boxShadow = 'none'
            }}
          />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={{
            display: 'block',
            fontSize: '12px',
            fontWeight: '600',
            color: '#3b82f6',
            marginBottom: '8px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>Company Email</label>
          <input
            type="email"
            placeholder="contact@example.com"
            defaultValue="admin@logisync.com"
            style={{
              width: '100%',
              padding: '10px 14px',
              fontSize: '14px',
              borderRadius: '10px',
              border: '2px solid var(--border)',
              transition: 'all 0.3s ease'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = 'var(--primary-500)'
              e.target.style.boxShadow = '0 0 0 3px var(--primary-100)'
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'var(--border)'
              e.target.style.boxShadow = 'none'
            }}
          />
        </div>
        <div style={{ marginBottom: 24 }}>
          <label style={{
            display: 'block',
            fontSize: '12px',
            fontWeight: '600',
            color: '#3b82f6',
            marginBottom: '8px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>Time Zone</label>
          <select
            defaultValue="Asia/Manila"
            style={{
              width: '100%',
              padding: '10px 14px',
              fontSize: '14px',
              borderRadius: '10px',
              border: '2px solid var(--border)',
              transition: 'all 0.3s ease'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = 'var(--primary-500)'
              e.target.style.boxShadow = '0 0 0 3px var(--primary-100)'
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'var(--border)'
              e.target.style.boxShadow = 'none'
            }}
          >
            <option value="Asia/Manila">Asia/Manila (PHT)</option>
            <option value="UTC">UTC</option>
            <option value="America/New_York">America/New_York (EST)</option>
          </select>
        </div>
        <button
          className="btn btn-primary"
          style={{
            padding: '10px 24px',
            fontSize: '14px',
            fontWeight: '600',
            borderRadius: '10px',
            transition: 'all 0.2s ease'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = 'translateY(-1px)'
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.15)'
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = 'none'
          }}
        >
          💾 Save Changes
        </button>
      </div>

      <div style={{
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(10px)',
        borderRadius: '16px',
        padding: '28px',
        border: '2px solid rgba(255, 255, 255, 0.1)'
      }}>
        <h3 style={{
          margin: '0 0 20px 0',
          fontSize: '20px',
          fontWeight: '700',
          color: 'white'
        }}>🔔 Notifications</h3>
        <div style={{ marginBottom: 16 }}>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            cursor: 'pointer',
            padding: '12px',
            borderRadius: '8px',
            transition: 'background 0.2s ease'
          }}
          onMouseOver={(e) => e.currentTarget.style.background = 'var(--surface-50)'}
          onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <input type="checkbox" defaultChecked style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
            <span style={{ fontSize: '14px', fontWeight: '500' }}>Email notifications for new orders</span>
          </label>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            cursor: 'pointer',
            padding: '12px',
            borderRadius: '8px',
            transition: 'background 0.2s ease'
          }}
          onMouseOver={(e) => e.currentTarget.style.background = 'var(--surface-50)'}
          onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <input type="checkbox" defaultChecked style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
            <span style={{ fontSize: '14px', fontWeight: '500' }}>Email notifications for shipment updates</span>
          </label>
        </div>
        <div style={{ marginBottom: 24 }}>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            cursor: 'pointer',
            padding: '12px',
            borderRadius: '8px',
            transition: 'background 0.2s ease'
          }}
          onMouseOver={(e) => e.currentTarget.style.background = 'var(--surface-50)'}
          onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <input type="checkbox" style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
            <span style={{ fontSize: '14px', fontWeight: '500' }}>SMS notifications for urgent alerts</span>
          </label>
        </div>
        <button
          className="btn btn-primary"
          style={{
            padding: '10px 24px',
            fontSize: '14px',
            fontWeight: '600',
            borderRadius: '10px',
            transition: 'all 0.2s ease'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = 'translateY(-1px)'
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.15)'
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = 'none'
          }}
        >
          💾 Save Changes
        </button>
      </div>

      <div style={{
        background: 'rgba(239, 68, 68, 0.1)',
        backdropFilter: 'blur(10px)',
        borderRadius: '16px',
        padding: '28px',
        border: '2px solid rgba(239, 68, 68, 0.3)'
      }}>
        <h3 style={{
          margin: '0 0 12px 0',
          fontSize: '20px',
          fontWeight: '700',
          color: '#ef4444'
        }}>⚠️ Danger Zone</h3>
        <p style={{
          margin: '0 0 20px 0',
          fontSize: '14px',
          color: 'rgba(255, 255, 255, 0.7)'
        }}>Irreversible actions - proceed with caution</p>
        <button
          className="btn btn-danger"
          style={{
            padding: '10px 24px',
            fontSize: '14px',
            fontWeight: '600',
            borderRadius: '10px',
            transition: 'all 0.2s ease'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = 'translateY(-1px)'
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(239, 68, 68, 0.3)'
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = 'none'
          }}
        >
          🗑️ Delete Account
        </button>
      </div>
    </div>
  )
}
