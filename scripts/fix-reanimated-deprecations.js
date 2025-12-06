#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const reanimatedBasePath = path.join(
  __dirname,
  '..',
  'node_modules',
  'react-native-reanimated',
  'Common',
  'cpp',
  'reanimated'
);

// Files that need deprecation fixes
const filesToFix = [
  {
    file: 'Fabric/PropsRegistry.h',
    fixes: [
      {
        pattern: /ShadowNode::Shared/g,
        replacement: 'std::shared_ptr<const ShadowNode>'
      }
    ]
  },
  {
    file: 'Fabric/PropsRegistry.cpp',
    fixes: [
      {
        pattern: /ShadowNode::Shared/g,
        replacement: 'std::shared_ptr<const ShadowNode>'
      }
    ]
  },
  {
    file: 'Fabric/ReanimatedMountHook.h',
    fixes: [
      {
        pattern: /Rootstd::shared_ptr<const ShadowNode>/g,
        replacement: 'std::shared_ptr<const RootShadowNode>'
      },
      {
        pattern: /double\s+mountTime/g,
        replacement: 'HighResTimeStamp mountTime'
      }
    ]
  },
  {
    file: 'Fabric/ReanimatedMountHook.cpp',
    fixes: [
      {
        pattern: /Rootstd::shared_ptr<const ShadowNode>/g,
        replacement: 'std::shared_ptr<const RootShadowNode>'
      },
      {
        pattern: /Rootstd::shared_ptr<ShadowNode>/g,
        replacement: 'std::shared_ptr<RootShadowNode>'
      },
      {
        pattern: /double\s+mountTime/g,
        replacement: 'HighResTimeStamp mountTime'
      }
    ]
  },
  {
    file: 'Fabric/ShadowTreeCloner.h',
    fixes: [
      {
        pattern: /Rootstd::shared_ptr<ShadowNode>/g,
        replacement: 'std::shared_ptr<RootShadowNode>'
      }
    ]
  },
  {
    file: 'Fabric/ShadowTreeCloner.cpp',
    fixes: [
      {
        pattern: /ShadowNode::Unshared/g,
        replacement: 'std::shared_ptr<ShadowNode>'
      },
      {
        pattern: /ShadowNode::ListOfShared/g,
        replacement: 'std::vector<std::shared_ptr<const ShadowNode>>'
      }
    ]
  }
];

function fixFile(filePath, fixes, fileName) {
  if (!fs.existsSync(filePath)) {
    return false;
  }

  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    for (const fix of fixes) {
      const beforeContent = content;
      // Use global replace
      const globalPattern = fix.pattern.global ? fix.pattern : new RegExp(fix.pattern.source, fix.pattern.flags + 'g');
      content = content.replace(globalPattern, fix.replacement);
      if (content !== beforeContent) {
        modified = true;
      }
    }

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✓ Fixed ${fileName}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`⚠ Error fixing ${fileName}:`, error.message);
    return false;
  }
}

// Main execution
if (fs.existsSync(reanimatedBasePath)) {
  console.log('Fixing react-native-reanimated deprecation warnings...');
  
  let fixedCount = 0;
  
  // Fix specific files
  for (const fileConfig of filesToFix) {
    const filePath = path.join(reanimatedBasePath, fileConfig.file);
    if (fixFile(filePath, fileConfig.fixes, fileConfig.file)) {
      fixedCount++;
    }
  }
  
  // Also scan for any other files with deprecated types
  console.log('Scanning for additional files with deprecated types...');
  const allCppFiles = [];
  function findAllCppFiles(dir) {
    try {
      const files = fs.readdirSync(dir);
      files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
          findAllCppFiles(filePath);
        } else if (file.endsWith('.cpp') || file.endsWith('.h') || file.endsWith('.hpp')) {
          allCppFiles.push(filePath);
        }
      });
    } catch (error) {
      // Ignore errors
    }
  }
  
  try {
    findAllCppFiles(reanimatedBasePath);
    allCppFiles.forEach(filePath => {
      try {
        let content = fs.readFileSync(filePath, 'utf8');
        let modified = false;
        const originalContent = content;
        
        // Fix deprecated types
        if (content.includes('ShadowNode::Shared')) {
          content = content.replace(/ShadowNode::Shared/g, 'std::shared_ptr<const ShadowNode>');
          modified = true;
        }
        
        if (content.includes('ShadowNode::Unshared')) {
          content = content.replace(/ShadowNode::Unshared/g, 'std::shared_ptr<ShadowNode>');
          modified = true;
        }
        
        if (content.includes('ShadowNode::ListOfShared')) {
          content = content.replace(/ShadowNode::ListOfShared/g, 'std::vector<std::shared_ptr<const ShadowNode>>');
          modified = true;
        }
        
        if (content.includes('Rootstd::shared_ptr')) {
          content = content.replace(/Rootstd::shared_ptr<const ShadowNode>/g, 'std::shared_ptr<const RootShadowNode>');
          content = content.replace(/Rootstd::shared_ptr<ShadowNode>/g, 'std::shared_ptr<RootShadowNode>');
          modified = true;
        }
        
        if (content.includes('double mountTime') && !content.includes('HighResTimeStamp mountTime')) {
          content = content.replace(/double\s+mountTime/g, 'HighResTimeStamp mountTime');
          modified = true;
        }
        
        if (modified && content !== originalContent) {
          fs.writeFileSync(filePath, content, 'utf8');
        }
      } catch (error) {
        // Skip files that can't be read/written
      }
    });
  } catch (error) {
    // Ignore errors
  }
  
  if (fixedCount > 0) {
    console.log(`\n✓ Total: Fixed ${fixedCount} file(s)`);
  } else {
    console.log('✓ All files already fixed or up-to-date');
  }
} else {
  console.log('⚠ react-native-reanimated not found, skipping fix (this is normal if the package is not installed yet)');
}

