import { startMemoryWatchdog } from '../memory-watchdog'

export default function globalSetup() {
  startMemoryWatchdog(5000)
}
