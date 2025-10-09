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
    <div>
      <h1 style={{ marginTop: 0 }}>System Settings</h1>
      <p className="muted">Configure system preferences and integrations</p>

      {/* Pricing Formula Section */}
      <div className="card" style={{ marginTop: 24 }}>
        <h2 style={{ marginTop: 0, marginBottom: 8 }}>💰 Pricing Formula</h2>
        <p className="muted" style={{ marginBottom: 24 }}>Customize how shipping costs are calculated for all quotes</p>

        {pricingLoading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--gray-500)' }}>
            Loading pricing configuration...
          </div>
        ) : pricingConfig ? (
          <>
            <div className="grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: 24 }}>
              <label>
                <div className="label">Base Rate (₱)</div>
                <input
                  type="number"
                  className="input"
                  step="0.01"
                  min="0"
                  value={pricingConfig.base_rate}
                  onChange={(e) => handlePricingChange('base_rate', e.target.value)}
                />
                <div className="helper">Fixed starting price for all shipments</div>
              </label>

              <label>
                <div className="label">Per Kilometer (₱)</div>
                <input
                  type="number"
                  className="input"
                  step="0.01"
                  min="0"
                  value={pricingConfig.per_km_rate}
                  onChange={(e) => handlePricingChange('per_km_rate', e.target.value)}
                />
                <div className="helper">Cost per kilometer of distance</div>
              </label>

              <label>
                <div className="label">Per Kilogram (₱)</div>
                <input
                  type="number"
                  className="input"
                  step="0.01"
                  min="0"
                  value={pricingConfig.per_kg_rate}
                  onChange={(e) => handlePricingChange('per_kg_rate', e.target.value)}
                />
                <div className="helper">Cost per kilogram of weight</div>
              </label>

              <label>
                <div className="label">Fuel Surcharge (%)</div>
                <input
                  type="number"
                  className="input"
                  step="0.01"
                  min="0"
                  max="100"
                  value={pricingConfig.fuel_surcharge_percent}
                  onChange={(e) => handlePricingChange('fuel_surcharge_percent', e.target.value)}
                />
                <div className="helper">Percentage added for fuel costs</div>
              </label>

              <label>
                <div className="label">Insurance (%)</div>
                <input
                  type="number"
                  className="input"
                  step="0.01"
                  min="0"
                  max="100"
                  value={pricingConfig.insurance_percent}
                  onChange={(e) => handlePricingChange('insurance_percent', e.target.value)}
                />
                <div className="helper">Percentage for insurance coverage</div>
              </label>

              <label>
                <div className="label">Minimum Charge (₱)</div>
                <input
                  type="number"
                  className="input"
                  step="0.01"
                  min="0"
                  value={pricingConfig.minimum_charge}
                  onChange={(e) => handlePricingChange('minimum_charge', e.target.value)}
                />
                <div className="helper">Minimum amount to charge regardless of calculation</div>
              </label>

              <label>
                <div className="label">Standard Multiplier (x)</div>
                <input
                  type="number"
                  className="input"
                  step="0.01"
                  min="1"
                  value={pricingConfig.priority_multiplier}
                  onChange={(e) => handlePricingChange('priority_multiplier', e.target.value)}
                />
                <div className="helper">Multiplier for standard destinations</div>
              </label>

              <label>
                <div className="label">Remote Multiplier (x)</div>
                <input
                  type="number"
                  className="input"
                  step="0.01"
                  min="1"
                  value={pricingConfig.express_multiplier}
                  onChange={(e) => handlePricingChange('express_multiplier', e.target.value)}
                />
                <div className="helper">Multiplier for remote areas (provinces, islands)</div>
              </label>
            </div>

            {/* Preview Calculator */}
            <div style={{
              background: 'var(--gray-50)',
              border: '1px solid var(--gray-200)',
              borderRadius: '8px',
              padding: '20px',
              marginBottom: 24
            }}>
              <h3 style={{ marginTop: 0, marginBottom: 16 }}>📊 Preview Calculation</h3>

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
            >
              {pricingSaving ? 'Saving...' : 'Save Pricing Formula'}
            </button>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--danger-600)' }}>
            Failed to load pricing configuration
          </div>
        )}
      </div>

      <div className="card" style={{ marginTop: 24 }}>
        <h3 style={{ marginTop: 0 }}>General Settings</h3>
        <div style={{ marginTop: 16 }}>
          <label className="label">Company Name</label>
          <input type="text" placeholder="Your company name" defaultValue="LogiSync Inc." />
        </div>
        <div style={{ marginTop: 16 }}>
          <label className="label">Company Email</label>
          <input type="email" placeholder="contact@example.com" defaultValue="admin@logisync.com" />
        </div>
        <div style={{ marginTop: 16 }}>
          <label className="label">Time Zone</label>
          <select defaultValue="Asia/Manila">
            <option value="Asia/Manila">Asia/Manila (PHT)</option>
            <option value="UTC">UTC</option>
            <option value="America/New_York">America/New_York (EST)</option>
          </select>
        </div>
        <button className="btn btn-primary" style={{ marginTop: 16 }}>
          Save Changes
        </button>
      </div>

      <div className="card" style={{ marginTop: 24 }}>
        <h3 style={{ marginTop: 0 }}>Notifications</h3>
        <div style={{ marginTop: 16 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input type="checkbox" defaultChecked />
            <span>Email notifications for new orders</span>
          </label>
        </div>
        <div style={{ marginTop: 12 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input type="checkbox" defaultChecked />
            <span>Email notifications for shipment updates</span>
          </label>
        </div>
        <div style={{ marginTop: 12 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input type="checkbox" />
            <span>SMS notifications for urgent alerts</span>
          </label>
        </div>
        <button className="btn btn-primary" style={{ marginTop: 16 }}>
          Save Changes
        </button>
      </div>

      <div className="card" style={{ marginTop: 24 }}>
        <h3 style={{ marginTop: 0 }}>Integrations</h3>
        <p className="muted">Coming soon: Connect with third-party services</p>
        <ul style={{ marginTop: 16, paddingLeft: 20 }}>
          <li>Payment Gateways (PayPal, Stripe)</li>
          <li>GPS Tracking Services</li>
          <li>Email Service Providers</li>
          <li>SMS Gateways</li>
        </ul>
      </div>

      <div className="card" style={{ marginTop: 24, borderColor: 'var(--danger-300)' }}>
        <h3 style={{ marginTop: 0, color: 'var(--danger-600)' }}>Danger Zone</h3>
        <p className="muted">Irreversible actions - proceed with caution</p>
        <button className="btn btn-danger" style={{ marginTop: 16 }}>
          Delete Account
        </button>
      </div>
    </div>
  )
}
