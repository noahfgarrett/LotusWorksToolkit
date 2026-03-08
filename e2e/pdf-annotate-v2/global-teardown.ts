import { stopMemoryWatchdog } from '../memory-watchdog'

export default function globalTeardown() {
  stopMemoryWatchdog()
}
