console.log('1');

const { createServer } = require('http');

console.log('2');

const { Server } = require('socket.io');

console.log('3');

const PORT = process.env.PORT || 3002;

console.log('4', PORT);

const server = createServer();

console.log('5');

const io = new Server(server);

console.log('6');

// Mock data for development - matching API structure
const mockVehicles = [
  { id: 1, currentLatitude: 40.7128, currentLongitude: -74.0060, status: 'available', plate: 'ABC-123' },
  { id: 2, currentLatitude: 40.7589, currentLongitude: -73.9851, status: 'busy', plate: 'DEF-456' },
  { id: 3, currentLatitude: 40.7505, currentLongitude: -73.9934, status: 'available', plate: 'GHI-789' }
];

// Simulate vehicle movement
setInterval(() => {
  mockVehicles.forEach(vehicle => {
    if (vehicle.status === 'available') {
      // Small random movement
      vehicle.currentLatitude += (Math.random() - 0.5) * 0.001;
      vehicle.currentLongitude += (Math.random() - 0.5) * 0.001;
    }
  });
  // Broadcast updated positions every 5 seconds
  io.emit('vehicles:update', mockVehicles);
}, 5000);

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Send initial vehicle positions
  socket.emit('vehicles:update', mockVehicles);

  // Handle trip assignment
  socket.on('trip:assign', (data) => {
    console.log('Trip assigned:', data);
    // Update vehicle status
    const vehicle = mockVehicles.find(v => v.id === data.vehicleId);
    if (vehicle) {
      vehicle.status = 'busy';
    }
    // Broadcast to all clients
    io.emit('trip:assigned', data);
    io.emit('vehicles:update', mockVehicles);
  });

  // Handle trip completion
  socket.on('trip:complete', (data) => {
    console.log('Trip completed:', data);
    const vehicle = mockVehicles.find(v => v.id === data.vehicleId);
    if (vehicle) {
      vehicle.status = 'available';
    }
    io.emit('vehicles:update', mockVehicles);
  });

  // Handle vehicle position updates
  socket.on('vehicle:update', (data) => {
    console.log('Vehicle position update:', data);
    // Update mock data
    const vehicle = mockVehicles.find(v => v.id === data.id);
    if (vehicle) {
      vehicle.currentLatitude = data.currentLatitude;
      vehicle.currentLongitude = data.currentLongitude;
      vehicle.status = data.status;
    }
    // Broadcast updated positions
    io.emit('vehicles:update', mockVehicles);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Realtime service running on http://localhost:${PORT}`);
  console.log('Simulating vehicle movement every 5 seconds...');
});

console.log('7');
