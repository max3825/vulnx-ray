"""
Vulnx Installation Manager
Automatically checks and installs Vulnx if not present.
"""

import os
import subprocess
import logging
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)


class VulnxInstaller:
    """
    Manages Vulnx installation and configuration.
    
    Checks if Vulnx is available and installs it automatically if needed.
    Supports both pip-installed vulnx and local git clone.
    """
    
    def __init__(self, install_dir: str = "./vulnx"):
        """
        Initialize the installer.
        
        Args:
            install_dir: Directory where Vulnx will be cloned if needed
        """
        self.install_dir = Path(install_dir).resolve()
        self.vulnx_path: Optional[str] = None
        self.installation_method: Optional[str] = None
    
    def check_pip_vulnx(self) -> bool:
        """
        Check if vulnx is installed via pip.
        
        Returns:
            bool: True if vulnx command is available
        """
        # Try direct command
        try:
            result = subprocess.run(
                ["vulnx", "--help"],
                capture_output=True,
                timeout=5,
                text=True
            )
            if result.returncode == 0:
                logger.info("✓ Vulnx found via command line")
                self.vulnx_path = "vulnx"
                self.installation_method = "pip"
                return True
        except (subprocess.SubprocessError, FileNotFoundError):
            pass

        # Try python module
        try:
            result = subprocess.run(
                ["python", "-m", "vulnx", "--help"],
                capture_output=True,
                timeout=5,
                text=True
            )
            if result.returncode == 0:
                logger.info("✓ Vulnx found via python module")
                self.vulnx_path = "vulnx"
                self.installation_method = "module"
                return True
        except (subprocess.SubprocessError, FileNotFoundError):
            pass
        
        return False
    
    def check_local_vulnx(self) -> bool:
        """
        Check if vulnx exists in local directory.
        
        Returns:
            bool: True if local vulnx.py found
        """
        local_script = self.install_dir / "vulnx.py"
        if local_script.exists() and local_script.is_file():
            logger.info(f"✓ Vulnx found at {local_script}")
            self.vulnx_path = str(local_script)
            self.installation_method = "local"
            return True
        
        return False
    
    def install_from_git(self) -> bool:
        """
        Clone Vulnx from GitHub and install dependencies.
        
        Returns:
            bool: True if installation successful
        
        Raises:
            Exception: If installation fails
        """
        try:
            logger.info("Installing Vulnx from GitHub...")
            
            # Create parent directory if needed
            self.install_dir.parent.mkdir(parents=True, exist_ok=True)
            
            # Clone repository
            logger.info(f"Cloning to {self.install_dir}...")
            result = subprocess.run(
                [
                    "git", "clone",
                    "https://github.com/anouarbensaad/vulnx",
                    str(self.install_dir)
                ],
                capture_output=True,
                text=True,
                timeout=60
            )
            
            if result.returncode != 0:
                raise Exception(f"Git clone failed: {result.stderr}")
            
            logger.info("✓ Repository cloned successfully")
            
            # Install dependencies
            requirements_file = self.install_dir / "requirements.txt"
            if requirements_file.exists():
                logger.info("Installing dependencies...")
                result = subprocess.run(
                    ["pip", "install", "-r", str(requirements_file)],
                    capture_output=True,
                    text=True,
                    timeout=180
                )
                
                if result.returncode != 0:
                    logger.warning(f"Dependency installation warning: {result.stderr}")
                else:
                    logger.info("✓ Dependencies installed")
            
            # Make script executable (Unix-like systems)
            vulnx_script = self.install_dir / "vulnx.py"
            if vulnx_script.exists():
                try:
                    os.chmod(vulnx_script, 0o755)
                    logger.info("✓ Script made executable")
                except Exception as e:
                    logger.warning(f"Could not chmod: {e}")
                
                self.vulnx_path = str(vulnx_script)
                self.installation_method = "local"
                return True
            else:
                raise Exception("vulnx.py not found after cloning")
        
        except subprocess.TimeoutExpired:
            raise Exception("Installation timed out")
        except Exception as e:
            logger.error(f"Installation failed: {e}")
            raise
    
    def ensure_installed(self) -> str:
        """
        Ensure Vulnx is installed and return the path to use.
        
        This is the main method to call at app startup.
        
        Returns:
            str: Path or command to execute Vulnx
        
        Raises:
            Exception: If installation fails
        """
        logger.info("Checking Vulnx installation...")
        
        # Method 1: Check pip installation
        if self.check_pip_vulnx():
            return self.vulnx_path
        
        # Method 2: Check local directory
        if self.check_local_vulnx():
            return self.vulnx_path
        
        # Method 3: Install from git
        logger.warning("Vulnx not found. Installing from GitHub...")
        if self.install_from_git():
            return self.vulnx_path
        
        raise Exception(
            "Failed to install Vulnx. Please install manually:\n"
            "  pip install vulnx\n"
            "OR\n"
            "  git clone https://github.com/anouarbensaad/vulnx"
        )
    
    def get_command_prefix(self) -> list:
        """
        Get the command prefix to execute Vulnx.
        
        Returns:
            list: Command parts (e.g., ["vulnx"] or ["python3", "-m", "vulnx"])
        """
        if self.installation_method == "pip":
            return ["vulnx"]
        elif self.installation_method == "module":
            return ["python", "-m", "vulnx"]
        elif self.installation_method == "local":
            return ["python3", self.vulnx_path]
        else:
            raise Exception("Vulnx not initialized. Call ensure_installed() first.")
    
    def get_version(self) -> str:
        """
        Get installed Vulnx version.
        
        Returns:
            str: Version string or "unknown"
        """
        try:
            cmd = self.get_command_prefix() + ["--version"]
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=5
            )
            
            if result.returncode == 0:
                # Parse version from output
                for line in result.stdout.splitlines():
                    if "version" in line.lower() or "vulnx" in line.lower():
                        return line.strip()
            
            return "unknown"
        except Exception:
            return "unknown"


# Global installer instance
vulnx_installer = VulnxInstaller()


async def initialize_vulnx():
    """
    Initialize Vulnx at app startup.
    
    Call this from FastAPI lifespan event.
    """
    try:
        vulnx_path = vulnx_installer.ensure_installed()
        version = vulnx_installer.get_version()
        logger.info(f"Vulnx initialized: {vulnx_path} ({version})")
        return True
    except Exception as e:
        logger.error(f"Failed to initialize Vulnx: {e}")
        return False
