const { createServer } = require('http');
const { Server } = require('socket.io');

const PORT = process.env.PORT || 3002;
const server = createServer();
const io = new Server(server);

const mockVehicles = [
  { id: 1, currentLatitude: 40.7128, currentLongitude: -74.0060, status: 'available', plate: 'ABC-123' },
  { id: 2, currentLatitude: 40.7589, currentLongitude: -73.9851, status: 'busy', plate: 'DEF-456' },
  { id: 3, currentLatitude: 40.7505, currentLongitude: -73.9934, status: 'available', plate: 'GHI-789' }
];

setInterval(() => {
  mockVehicles.forEach(vehicle => {
    if (vehicle.status === 'available') {
      vehicle.currentLatitude += (Math.random() - 0.5) * 0.001;
      vehicle.currentLongitude += (Math.random() - 0.5) * 0.001;
    }
  });
  io.emit('vehicles:update', mockVehicles);
}, 5000);

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  socket.emit('vehicles:update', mockVehicles);
  socket.on('trip:assign', (data) => {
    const vehicle = mockVehicles.find(v => v.id === data.vehicleId);
    if (vehicle) vehicle.status = 'busy';
    io.emit('trip:assigned', data);
    io.emit('vehicles:update', mockVehicles);
  });
  socket.on('trip:complete', (data) => {
    const vehicle = mockVehicles.find(v => v.id === data.vehicleId);
    if (vehicle) vehicle.status = 'available';
    io.emit('vehicles:update', mockVehicles);
  });
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Realtime service running on http://localhost:${PORT}`);
});
