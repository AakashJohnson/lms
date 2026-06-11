import { User, Mail, Phone, MapPin, Lock, Globe, Zap, Loader2, CheckCircle2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import axiosInstance from '../../utils/axiosConfig';
import { toast } from 'sonner';

interface ProfileSettingsProps {
  userRole: 'admin' | 'trainer' | 'student';
}

interface UserProfile {
  _id: string;
  firstName: string;
  lastName: string;
  fullName?: string;
  name?: string;
  email: string;
  mobile?: string;
  location?: string;
  role: string;
  profilePicture?: string;
  isActive: boolean;
  createdAt?: string;
}

export function ProfileSettings({ userRole }: ProfileSettingsProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    mobile: '',
    location: '',
    organization: '',
    designation: '',
    specialization: [] as string[],
    experience: 0,
    profilePicture: '',
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Fetch profile from backend
  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get('/auth/me');
      if (response.data.success && response.data.data) {
        const userData = response.data.data;
        setProfile(userData);
        setFormData({
          firstName: userData.firstName || '',
          lastName: userData.lastName || '',
          email: userData.email || '',
          mobile: userData.mobile || '',
          location: userData.location || '',
          organization: userData.organization || '',
          designation: userData.designation || '',
          specialization: userData.specialization || [],
          experience: userData.experience || 0,
          profilePicture: userData.profilePicture || '',
        });
        
        // Update localStorage with fresh data
        localStorage.setItem('user', JSON.stringify(userData));
      } else {
        toast.error('Failed to load profile data');
      }
    } catch (error: any) {
      console.error('Error fetching profile:', error);
      console.error('Error response:', error.response?.data);
      
      // Show detailed error message
      const errorMsg = error.response?.data?.message || 
                      error.response?.data?.error || 
                      error.message || 
                      'Failed to load profile data';
      toast.error(errorMsg);
      
      // Try to use localStorage as fallback
      try {
        const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
        if (storedUser._id) {
          setProfile(storedUser as UserProfile);
          setFormData({
            firstName: storedUser.firstName || '',
            lastName: storedUser.lastName || '',
            email: storedUser.email || '',
            mobile: storedUser.mobile || '',
            location: storedUser.location || '',
            organization: storedUser.organization || '',
            designation: storedUser.designation || '',
            specialization: storedUser.specialization || [],
            experience: storedUser.experience || 0,
            profilePicture: storedUser.profilePicture || '',
          });
          toast.info('Using cached profile data', { duration: 2000 });
        }
      } catch (e) {
        console.error('Failed to load from localStorage:', e);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswordData({
      ...passwordData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      console.log('📤 Sending profile update:', formData);
      const response = await axiosInstance.put('/users/profile', formData);
      console.log('✅ Profile update response:', response.data);
      
      if (response.data.success) {
        // Update profile state immediately with response data
        if (response.data.data) {
          setProfile(response.data.data);
          
          // Also update formData to reflect saved values
          setFormData({
            firstName: response.data.data.firstName || '',
            lastName: response.data.data.lastName || '',
            email: response.data.data.email || '',
            mobile: response.data.data.mobile || '',
            location: response.data.data.location || '',
            organization: response.data.data.organization || '',
            designation: response.data.data.designation || '',
            specialization: response.data.data.specialization || [],
            experience: response.data.data.experience || 0,
            profilePicture: response.data.data.profilePicture || '',
          });
          
          // Update localStorage
          localStorage.setItem('user', JSON.stringify(response.data.data));
          
          // Dispatch custom event to notify App.tsx
          window.dispatchEvent(new CustomEvent('profileUpdated', { 
            detail: response.data.data 
          }));
        }
        
        toast.success('Profile updated successfully!', { icon: '✅' });
        
        // Refresh profile data from backend to ensure sync
        await fetchProfile();
      } else {
        toast.error(response.data.message || 'Failed to update profile');
      }
    } catch (error: any) {
      console.error('❌ Error updating profile:', error);
      console.error('Error response:', error.response?.data);
      
      const errorMsg = error.response?.data?.message || 
                      error.response?.data?.error ||
                      error.message || 
                      'Failed to update profile';
      toast.error(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!passwordData.currentPassword || !passwordData.newPassword) {
      toast.error('Please fill all password fields');
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    if (passwordData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setUpdatingPassword(true);
    try {
      const response = await axiosInstance.put('/users/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
      if (response.data.success) {
        toast.success('Password updated successfully!', { icon: '🔒' });
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
      }
    } catch (error: any) {
      console.error('Error updating password:', error);
      toast.error(error.response?.data?.message || 'Failed to update password');
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB');
      return;
    }

    setUploadingPhoto(true);
    try {
      // Convert to base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        
        // Update profile with new photo
        const response = await axiosInstance.put('/users/profile', {
          profilePicture: base64String
        });

        if (response.data.success) {
          setFormData({ ...formData, profilePicture: base64String });
          toast.success('Profile picture updated!', { icon: '📸' });
          await fetchProfile();
        }
      };
      reader.readAsDataURL(file);
    } catch (error: any) {
      console.error('Error uploading photo:', error);
      toast.error(error.response?.data?.message || 'Failed to upload photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-gray-500">Failed to load profile</p>
      </div>
    );
  }

  const fullName = profile.fullName || 
                   profile.name || 
                   `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || 
                   'User';
  const initials = fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';
  const memberSince = profile.createdAt 
    ? new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : 'Recently';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-gray-900">Profile Settings</h2>
        <p className="text-gray-600 mt-1">Manage your account information and preferences</p>
      </div>

      {/* Profile Card */}
      <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-2xl p-8 text-white">
        <div className="flex items-start gap-6">
          <div className="relative">
            <div className="w-24 h-24 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center text-4xl font-bold border-4 border-white/30 overflow-hidden">
              {formData.profilePicture ? (
                <img 
                  src={formData.profilePicture} 
                  alt="Profile" 
                  className="w-full h-full object-cover"
                />
              ) : (
                initials
              )}
            </div>
            {uploadingPhoto && (
              <div className="absolute inset-0 bg-black/50 rounded-2xl flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-white" />
              </div>
            )}
          </div>
          <div className="flex-1">
            <h3 className="text-2xl font-bold mb-2">{fullName}</h3>
            <p className="text-indigo-100 mb-4">Member since {memberSince}</p>
            <div className="flex gap-3">
              <span className="bg-white/20 backdrop-blur px-4 py-2 rounded-lg text-sm font-medium capitalize">
                {profile.role === 'administrator' ? 'Admin' : profile.role}
              </span>
              <span className={`backdrop-blur px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${
                profile.isActive 
                  ? 'bg-green-500/30' 
                  : 'bg-red-500/30'
              }`}>
                <span className={`w-2 h-2 rounded-full ${
                  profile.isActive 
                    ? 'bg-green-300 animate-pulse' 
                    : 'bg-red-300'
                }`}></span>
                {profile.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
          <label className="bg-white text-indigo-600 px-6 py-3 rounded-xl font-medium hover:bg-indigo-50 transition-all cursor-pointer">
            <input 
              type="file" 
              accept="image/*" 
              onChange={handlePhotoUpload}
              className="hidden"
              disabled={uploadingPhoto}
            />
            {uploadingPhoto ? 'Uploading...' : 'Change Photo'}
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personal Information */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
              <User className="w-5 h-5 text-indigo-600" />
            </div>
            <h3 className="font-semibold text-lg text-gray-900">Personal Information</h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="tel"
                  name="mobile"
                  value={formData.mobile}
                  onChange={handleInputChange}
                  placeholder="+91 98765 43210"
                  className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  placeholder="City, State"
                  className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Security Settings */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
              <Lock className="w-5 h-5 text-red-600" />
            </div>
            <h3 className="font-semibold text-lg text-gray-900">Security</h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Current Password</label>
              <input
                type="password"
                name="currentPassword"
                value={passwordData.currentPassword}
                onChange={handlePasswordChange}
                placeholder="Enter current password"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
              <input
                type="password"
                name="newPassword"
                value={passwordData.newPassword}
                onChange={handlePasswordChange}
                placeholder="Enter new password"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Confirm New Password</label>
              <input
                type="password"
                name="confirmPassword"
                value={passwordData.confirmPassword}
                onChange={handlePasswordChange}
                placeholder="Confirm new password"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <button 
              onClick={handleUpdatePassword}
              disabled={updatingPassword}
              className="w-full bg-gradient-to-r from-red-600 to-red-700 text-white py-3 rounded-xl font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {updatingPassword ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Password'
              )}
            </button>

            <div className="border-t border-gray-200 pt-4 mt-4">
              <div className="flex items-center justify-between p-4 bg-green-50 rounded-xl">
                <div>
                  <p className="font-medium text-gray-900">OTP Verification</p>
                  <p className="text-sm text-gray-600">Two-factor authentication</p>
                </div>
                <span className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-medium">
                  Enabled
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Professional Information - Only for Trainers */}
      {profile.role === 'trainer' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <User className="w-5 h-5 text-blue-600" />
            </div>
            <h3 className="font-semibold text-lg text-gray-900">Professional Information</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Organization</label>
              <input
                type="text"
                name="organization"
                value={formData.organization}
                onChange={handleInputChange}
                placeholder="Your organization name"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Designation</label>
              <input
                type="text"
                name="designation"
                value={formData.designation}
                onChange={handleInputChange}
                placeholder="Your job title"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Experience (Years)</label>
              <input
                type="number"
                name="experience"
                value={formData.experience}
                onChange={handleInputChange}
                min="0"
                placeholder="Years of experience"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Specialization</label>
              <input
                type="text"
                name="specialization"
                value={Array.isArray(formData.specialization) ? formData.specialization.join(', ') : ''}
                onChange={(e) => {
                  const specs = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                  setFormData({ ...formData, specialization: specs });
                }}
                placeholder="e.g., Management, Finance (comma separated)"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-xs text-gray-500 mt-1">Separate multiple specializations with commas</p>
            </div>
          </div>
        </div>
      )}

      {/* Preferences */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
            <Globe className="w-5 h-5 text-purple-600" />
          </div>
          <h3 className="font-semibold text-lg text-gray-900">Preferences</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
            <select className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option>English</option>
              <option>हिंदी (Hindi)</option>
              <option>বাংলা (Bengali)</option>
              <option>मराठी (Marathi)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Time Zone</label>
            <select className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option>IST (UTC +5:30)</option>
              <option>PST (UTC -8:00)</option>
              <option>EST (UTC -5:00)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Low Bandwidth Mode */}
      <div className="bg-gradient-to-br from-orange-50 to-yellow-50 border border-orange-200 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center flex-shrink-0">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-gray-900 mb-2">Low Bandwidth Mode</h4>
            <p className="text-sm text-gray-600 mb-4">
              Optimize your experience for slower internet connections by reducing video quality and prioritizing text content.
            </p>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" className="w-5 h-5 text-indigo-600 rounded" />
              <span className="text-sm font-medium text-gray-700">Enable Low Bandwidth Mode</span>
            </label>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex gap-3">
        <button 
          onClick={handleSaveProfile}
          disabled={saving}
          className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white px-8 py-3 rounded-xl font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4" />
              Save Changes
            </>
          )}
        </button>
        <button 
          onClick={fetchProfile}
          disabled={saving}
          className="bg-gray-100 text-gray-700 px-8 py-3 rounded-xl font-medium hover:bg-gray-200 transition-all disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
