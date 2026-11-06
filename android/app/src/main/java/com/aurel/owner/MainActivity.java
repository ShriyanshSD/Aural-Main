package com.aurel.owner;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(OwnerDownloadsPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
