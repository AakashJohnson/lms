import mongoose from 'mongoose';

const examSessionSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  assessment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Assessment',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  token: {
    type: String,
    required: true
  },
  deviceFingerprint: {
    type: String,
    required: true
  },
  ipAddress: {
    type: String,
    required: true
  },
  userAgent: {
    type: String
  },
  geoLocation: {
    country: String,
    city: String,
    latitude: Number,
    longitude: Number
  },
  systemInfo: {
    browser: {
      name: String,
      version: String,
      supported: Boolean
    },
    internetSpeed: {
      downloadSpeed: Number,
      uploadSpeed: Number,
      latency: Number
    },
    devices: {
      webcam: Boolean,
      microphone: Boolean
    },
    environment: {
      multipleMonitors: Boolean,
      screenSharing: Boolean,
      virtualMachine: Boolean
    }
  },
  startTime: {
    type: Date,
    default: Date.now
  },
  expiryTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date
  },
  status: {
    type: String,
    enum: ['active', 'paused', 'completed', 'terminated', 'expired'],
    default: 'active'
  },
  heartbeat: {
    lastPing: {
      type: Date,
      default: Date.now
    },
    missedPings: {
      type: Number,
      default: 0
    },
    threshold: {
      type: Number,
      default: 3
    }
  },
  violations: [{
    type: {
      type: String,
      enum: [
        'tab_switch', 'fullscreen_exit', 
        'copy_attempt', 'paste_attempt', 'cut_attempt',
        'right_click', 'keyboard_shortcut',
        'focus_lost', 'devtools_attempt',
        'multiple_faces', 'no_face',
        'suspicious_eye_movement', 'background_noise',
        'device_mismatch', 'session_hijack_attempt',
        'heartbeat_failure', 'network_disconnect'
      ]
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    details: String,
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium'
    }
  }],
  riskScore: {
    overall: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    level: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'low'
    },
    breakdown: {
      tabSwitches: { count: { type: Number, default: 0 }, score: { type: Number, default: 0 } },
      fullscreenExits: { count: { type: Number, default: 0 }, score: { type: Number, default: 0 } },
      multipleFaces: { count: { type: Number, default: 0 }, score: { type: Number, default: 0 } },
      noFace: { count: { type: Number, default: 0 }, score: { type: Number, default: 0 } },
      suspiciousEyeMovement: { count: { type: Number, default: 0 }, score: { type: Number, default: 0 } },
      backgroundNoise: { count: { type: Number, default: 0 }, score: { type: Number, default: 0 } },
      fastAnswering: { count: { type: Number, default: 0 }, score: { type: Number, default: 0 } },
      longInactivity: { count: { type: Number, default: 0 }, score: { type: Number, default: 0 } },
      deviceMismatch: { count: { type: Number, default: 0 }, score: { type: Number, default: 0 } },
      networkIssues: { count: { type: Number, default: 0 }, score: { type: Number, default: 0 } }
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  },
  recordings: {
    webcam: {
      url: String,
      startedAt: Date,
      stoppedAt: Date,
      chunks: [String]
    },
    screen: {
      url: String,
      startedAt: Date,
      stoppedAt: Date,
      chunks: [String]
    }
  },
  metadata: {
    preExamChecksPassed: {
      type: Boolean,
      default: false
    },
    identityVerified: {
      type: Boolean,
      default: false
    },
    consentGiven: {
      type: Boolean,
      default: false
    },
    instructionsRead: {
      type: Boolean,
      default: false
    }
  }
}, {
  timestamps: true
});

// Indexes for performance
examSessionSchema.index({ user: 1, assessment: 1 });
examSessionSchema.index({ status: 1, expiryTime: 1 });
examSessionSchema.index({ 'heartbeat.lastPing': 1 });

// Method to update heartbeat
examSessionSchema.methods.updateHeartbeat = function() {
  this.heartbeat.lastPing = new Date();
  this.heartbeat.missedPings = 0;
  return this.save();
};

// Method to add violation and update risk score
examSessionSchema.methods.addViolation = function(type, details, severity = 'medium') {
  this.violations.push({ type, details, severity, timestamp: new Date() });
  this.calculateRiskScore();
  return this.save();
};

// Method to calculate risk score
examSessionSchema.methods.calculateRiskScore = function() {
  const weights = {
    tab_switch: 5,
    fullscreen_exit: 5,
    multiple_faces: 15,
    no_face: 10,
    suspicious_eye_movement: 8,
    background_noise: 3,
    fast_answering: 7,
    long_inactivity: 4,
    device_mismatch: 20,
    session_hijack_attempt: 25,
    heartbeat_failure: 6,
    network_disconnect: 5,
    devtools_attempt: 10,
    copy_attempt: 8,
    paste_attempt: 8,
    cut_attempt: 8,
    right_click: 3,
    keyboard_shortcut: 5,
    focus_lost: 4
  };

  let totalScore = 0;
  const breakdown = {
    tabSwitches: { count: 0, score: 0 },
    fullscreenExits: { count: 0, score: 0 },
    multipleFaces: { count: 0, score: 0 },
    noFace: { count: 0, score: 0 },
    suspiciousEyeMovement: { count: 0, score: 0 },
    backgroundNoise: { count: 0, score: 0 },
    fastAnswering: { count: 0, score: 0 },
    longInactivity: { count: 0, score: 0 },
    deviceMismatch: { count: 0, score: 0 },
    networkIssues: { count: 0, score: 0 }
  };

  // Count violations and calculate scores
  this.violations.forEach(v => {
    const weight = weights[v.type] || 5;
    totalScore += weight;

    // Map to breakdown categories
    if (v.type === 'tab_switch') {
      breakdown.tabSwitches.count++;
      breakdown.tabSwitches.score += weight;
    } else if (v.type === 'fullscreen_exit') {
      breakdown.fullscreenExits.count++;
      breakdown.fullscreenExits.score += weight;
    } else if (v.type === 'multiple_faces') {
      breakdown.multipleFaces.count++;
      breakdown.multipleFaces.score += weight;
    } else if (v.type === 'no_face') {
      breakdown.noFace.count++;
      breakdown.noFace.score += weight;
    } else if (v.type === 'suspicious_eye_movement') {
      breakdown.suspiciousEyeMovement.count++;
      breakdown.suspiciousEyeMovement.score += weight;
    } else if (v.type === 'background_noise') {
      breakdown.backgroundNoise.count++;
      breakdown.backgroundNoise.score += weight;
    } else if (v.type === 'fast_answering') {
      breakdown.fastAnswering.count++;
      breakdown.fastAnswering.score += weight;
    } else if (v.type === 'long_inactivity') {
      breakdown.longInactivity.count++;
      breakdown.longInactivity.score += weight;
    } else if (v.type === 'device_mismatch' || v.type === 'session_hijack_attempt') {
      breakdown.deviceMismatch.count++;
      breakdown.deviceMismatch.score += weight;
    } else if (v.type === 'heartbeat_failure' || v.type === 'network_disconnect') {
      breakdown.networkIssues.count++;
      breakdown.networkIssues.score += weight;
    }
  });

  // Determine risk level
  const level = 
    totalScore >= 80 ? 'critical' :
    totalScore >= 50 ? 'high' :
    totalScore >= 25 ? 'medium' : 'low';

  this.riskScore = {
    overall: Math.min(totalScore, 100),
    level,
    breakdown,
    lastUpdated: new Date()
  };
};

// Static method to check for expired sessions
examSessionSchema.statics.expireOldSessions = async function() {
  const now = new Date();
  const result = await this.updateMany(
    { 
      status: 'active',
      expiryTime: { $lt: now }
    },
    { 
      status: 'expired',
      endTime: now
    }
  );
  return result;
};

// Static method to check for stale heartbeats
examSessionSchema.statics.checkStaleHeartbeats = async function() {
  const threshold = 30000; // 30 seconds
  const now = new Date();
  const staleTime = new Date(now.getTime() - threshold);
  
  const staleSessions = await this.find({
    status: 'active',
    'heartbeat.lastPing': { $lt: staleTime }
  });

  for (const session of staleSessions) {
    session.heartbeat.missedPings++;
    if (session.heartbeat.missedPings >= session.heartbeat.threshold) {
      session.status = 'paused';
      await session.addViolation('heartbeat_failure', `Missed ${session.heartbeat.missedPings} heartbeats`, 'high');
    }
    await session.save();
  }

  return staleSessions.length;
};

const ExamSession = mongoose.model('ExamSession', examSessionSchema);

export default ExamSession;
