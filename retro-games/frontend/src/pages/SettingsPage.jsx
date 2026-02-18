import { Link } from 'react-router-dom'
import Logo from '../components/Logo'
import CollapsibleSection from '../components/CollapsibleSection'
import './Dashboard.css'
import './SettingsPage.css'

function SettingsPage() {
  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <Link to="/" className="logo-link">
          <Logo />
        </Link>
        <nav>
          <Link to="/user/dashboard" className="nav-link">Dashboard</Link>
          <Link to="/admin/dashboard" className="nav-link">Admin</Link>
          <Link to="/" className="logout-link">Logout</Link>
        </nav>
      </header>
      <main className="dashboard-main settings-main">
        <h1>Settings</h1>
        <p className="dashboard-subtitle">Manage your account and preferences</p>

        <div className="settings-sections">
          <CollapsibleSection title="User Profile">
            <div className="settings-content">
              <p>Update your profile information.</p>
              <div className="settings-field">
                <label>Display Name</label>
                <input type="text" placeholder="Your name" />
              </div>
              <div className="settings-field">
                <label>Email</label>
                <input type="email" placeholder="your@email.com" />
              </div>
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="Notifications">
            <div className="settings-content">
              <p>Choose how you want to be notified.</p>
              <div className="settings-field checkbox-field">
                <label>
                  <input type="checkbox" defaultChecked />
                  Email notifications
                </label>
              </div>
              <div className="settings-field checkbox-field">
                <label>
                  <input type="checkbox" />
                  Game updates
                </label>
              </div>
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="Privacy">
            <div className="settings-content">
              <p>Control your privacy settings.</p>
              <div className="settings-field checkbox-field">
                <label>
                  <input type="checkbox" defaultChecked />
                  Show profile to other players
                </label>
              </div>
              <div className="settings-field checkbox-field">
                <label>
                  <input type="checkbox" />
                  Allow game invites
                </label>
              </div>
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="Security">
            <div className="settings-content">
              <p>Manage your account security.</p>
              <div className="settings-field">
                <label>Change Password</label>
                <input type="password" placeholder="New password" />
              </div>
            </div>
          </CollapsibleSection>
        </div>
      </main>
    </div>
  )
}

export default SettingsPage
